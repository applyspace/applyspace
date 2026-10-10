'use client';

import Link from 'next/link';
import { useOptimistic, useState, useTransition } from 'react';
import type { ApplicationStatus } from '@apply/core/applications';
import { HugeiconsIcon } from '@hugeicons/react';
import { Add01Icon } from '@hugeicons/core-free-icons';
import { buttonVariants, Button } from '@/components/ui/button';
import {
  NO_FILTERS,
  applyFilters,
  countByStatus,
  hasFilters,
  type HubApplication,
  type HubFilters,
  type HubLayout,
} from '@/lib/applicationsHub';
import { useHubT } from '@/lib/applicationsI18n';
import { cn } from '@/lib/utils';
import { updateApplicationStatus } from '@/app/(auth)/applications/actions';
import { analytics } from '@/lib/analytics';
import { ApplicationPeek } from './ApplicationPeek';
import { BoardLayout } from './BoardLayout';
import { HubHeader } from './HubHeader';
import { MapLayout } from './MapLayout';
import { NewApplicationPeek } from './NewApplicationPeek';
import type { HubDocument } from './ApplicationForm';
import { TableLayout } from './TableLayout';
import { TimelineLayout } from './TimelineLayout';

/** Layouts that are built; the others show disabled in the switcher. */
const AVAILABLE_LAYOUTS: readonly HubLayout[] = ['board', 'table', 'timeline', 'map'];

export function ApplicationsHub({
  applications,
  cap,
  nowIso,
  initialLayout,
  canCreate,
  initialNew,
  today,
  companyNames,
  documents,
}: {
  applications: HubApplication[];
  /** Plan cap on applications; null when unlimited or unknown. */
  cap: number | null;
  /** Server time, so server and client render the same relative dates. */
  nowIso: string;
  initialLayout: HubLayout;
  /** False when there is no account to save to (demo host, signed out). */
  canCreate: boolean;
  /** Open the "new application" peek on load (`?new=1`). */
  initialNew: boolean;
  /** `YYYY-MM-DD` of today, from the server. */
  today: string;
  companyNames: string[];
  documents: HubDocument[];
}) {
  const { t } = useHubT();
  const now = Date.parse(nowIso);
  const [layout, setLayout] = useState<HubLayout>(
    AVAILABLE_LAYOUTS.includes(initialLayout) ? initialLayout : 'board',
  );
  const [filters, setFilters] = useState<HubFilters>(NO_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(initialNew);
  const [, startTransition] = useTransition();

  const [items, applyMove] = useOptimistic(
    applications,
    (state, move: { id: string; status: ApplicationStatus }) =>
      state.map((a) => (a.id === move.id ? { ...a, status: move.status } : a)),
  );

  function changeLayout(next: HubLayout) {
    if (next === layout) return;
    analytics.capture('applications_layout_changed', { from_layout: layout, to_layout: next });
    setLayout(next);
    // Keep the layout in the URL so a reload or a shared link opens the same view.
    const url = new URL(window.location.href);
    if (next === 'board') url.searchParams.delete('layout');
    else url.searchParams.set('layout', next);
    window.history.replaceState(null, '', url);
  }

  function move(id: string, status: ApplicationStatus) {
    setError(null);
    const fromStatus = items.find((a) => a.id === id)?.status;
    startTransition(async () => {
      applyMove({ id, status });
      const result = await updateApplicationStatus(id, status);
      if (!result.ok) {
        setError(t.statusError);
        return;
      }
      // Only a saved move counts; ids and company names are never sent.
      if (fromStatus && fromStatus !== status) {
        analytics.capture('application_status_changed', { from_status: fromStatus, to_status: status, layout });
      }
    });
  }

  function closeNew() {
    setNewOpen(false);
    const url = new URL(window.location.href);
    if (url.searchParams.has('new')) {
      url.searchParams.delete('new');
      window.history.replaceState(null, '', url);
    }
  }

  const capReached = cap !== null && items.length >= cap;
  const newButton = canCreate ? (
    <Button onClick={() => setNewOpen(true)} disabled={capReached} title={capReached && cap !== null ? t.capReached(cap) : undefined}>
      <HugeiconsIcon icon={Add01Icon} size={15} />
      <span className="hidden sm:inline">{t.form.open}</span>
      <span className="sr-only sm:hidden">{t.form.open}</span>
    </Button>
  ) : null;

  const visible = applyFilters(items, filters, now);
  const selected = items.find((a) => a.id === selectedId) ?? null;

  return (
    <div className="flex h-full flex-col gap-5 px-4 py-6 sm:px-8 md:px-12 md:py-10">
      <HubHeader
        used={items.length}
        cap={cap}
        layout={layout}
        availableLayouts={AVAILABLE_LAYOUTS}
        onLayoutChange={changeLayout}
        filters={filters}
        onFiltersChange={setFilters}
        counts={countByStatus(items)}
        actions={newButton}
      />

      {error && (
        <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {items.length === 0 ? (
        <EmptyState title={t.emptyTitle} body={t.emptyBody}>
          {newButton}
          <Link href="/offers" className={cn(buttonVariants({ variant: 'outline' }))}>
            {t.browseOffers}
          </Link>
        </EmptyState>
      ) : visible.length === 0 ? (
        <EmptyState title={t.noMatchTitle} body={t.noMatchBody}>
          {hasFilters(filters) && (
            <Button variant="outline" onClick={() => setFilters(NO_FILTERS)}>
              {t.clearFilters}
            </Button>
          )}
        </EmptyState>
      ) : (
        <>
          {layout === 'board' && (
            <BoardLayout applications={visible} now={now} onOpen={(a) => setSelectedId(a.id)} onMove={move} />
          )}
          {layout === 'table' && (
            <TableLayout applications={visible} now={now} onOpen={(a) => setSelectedId(a.id)} onMove={move} />
          )}
          {layout === 'timeline' && (
            <TimelineLayout applications={visible} now={now} onOpen={(a) => setSelectedId(a.id)} />
          )}
          {layout === 'map' && <MapLayout applications={visible} onOpen={(a) => setSelectedId(a.id)} />}
        </>
      )}

      <ApplicationPeek application={selected} onClose={() => setSelectedId(null)} onMove={move} />
      <NewApplicationPeek
        open={newOpen && canCreate}
        onClose={closeNew}
        today={today}
        companyNames={companyNames}
        documents={documents}
        capReached={capReached}
        cap={cap}
      />
    </div>
  );
}

function EmptyState({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-6 py-16 text-center">
      <h2 className="text-base font-medium text-foreground">{title}</h2>
      <p className="max-w-sm text-sm text-muted-foreground">{body}</p>
      {children}
    </div>
  );
}
