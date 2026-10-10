'use client';

import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import { KanbanIcon, Table01Icon, ChartGanttIcon, MapPinpoint01Icon, Search01Icon } from '@hugeicons/core-free-icons';
import type { ApplicationStatus } from '@apply/core/applications';
import { Input } from '@/components/ui/input';
import { HUB_LAYOUTS, HUB_STATUSES, type HubFilters, type HubLayout } from '@/lib/applicationsHub';
import { useHubT } from '@/lib/applicationsI18n';
import { cn } from '@/lib/utils';
import { STATUS_TONE } from './statusTone';

const LAYOUT_ICON: Record<HubLayout, IconSvgElement> = {
  board: KanbanIcon,
  table: Table01Icon,
  timeline: ChartGanttIcon,
  map: MapPinpoint01Icon,
};

/** Title, plan meter, layout switcher, search and status chips: shared by every layout. */
export function HubHeader({
  used,
  cap,
  layout,
  availableLayouts,
  onLayoutChange,
  filters,
  onFiltersChange,
  counts,
  actions,
}: {
  used: number;
  cap: number | null;
  layout: HubLayout;
  availableLayouts: readonly HubLayout[];
  onLayoutChange: (layout: HubLayout) => void;
  filters: HubFilters;
  onFiltersChange: (filters: HubFilters) => void;
  counts: Record<ApplicationStatus, number>;
  /** Right-aligned buttons (for example "New application"). */
  actions?: React.ReactNode;
}) {
  const { t } = useHubT();
  const nearCap = cap !== null && used >= Math.ceil(cap * 0.9);

  function toggleStatus(status: ApplicationStatus) {
    const statuses = filters.statuses.includes(status)
      ? filters.statuses.filter((s) => s !== status)
      : [...filters.statuses, status];
    onFiltersChange({ ...filters, statuses });
  }

  return (
    <header className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t.title}</h1>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-xs font-medium tabular-nums',
              nearCap
                ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                : 'bg-muted text-muted-foreground',
            )}
          >
            {t.cap(used, cap)}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div role="group" aria-label={t.layoutLabel} className="flex items-center gap-0.5 rounded-full border bg-background p-0.5">
            {HUB_LAYOUTS.map((l) => {
              const available = availableLayouts.includes(l);
              return (
                <button
                  key={l}
                  type="button"
                  disabled={!available}
                  aria-pressed={layout === l}
                  title={available ? t.layouts[l] : `${t.layouts[l]} - ${t.layoutSoon}`}
                  onClick={() => onLayoutChange(l)}
                  className={cn(
                    'inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:opacity-40',
                    layout === l ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <HugeiconsIcon icon={LAYOUT_ICON[l]} size={15} />
                  <span className="hidden sm:inline">{t.layouts[l]}</span>
                  <span className="sr-only sm:hidden">{t.layouts[l]}</span>
                </button>
              );
            })}
          </div>
          {actions}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72">
          <HugeiconsIcon
            icon={Search01Icon}
            size={15}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={filters.query}
            onChange={(e) => onFiltersChange({ ...filters, query: e.target.value })}
            placeholder={t.search}
            aria-label={t.search}
            className="pl-9"
          />
        </div>
        {HUB_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={filters.statuses.includes(s)}
            onClick={() => toggleStatus(s)}
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors',
              filters.statuses.includes(s)
                ? 'border-transparent bg-primary text-primary-foreground'
                : 'bg-background text-muted-foreground hover:text-foreground',
            )}
          >
            <span className={cn('size-1.5 rounded-full', STATUS_TONE[s].dot)} />
            {t.statusesShort[s]}
            <span className="tabular-nums opacity-70">{counts[s]}</span>
          </button>
        ))}
        <button
          type="button"
          aria-pressed={filters.attention}
          onClick={() => onFiltersChange({ ...filters, attention: !filters.attention })}
          className={cn(
            'inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium transition-colors',
            filters.attention
              ? 'border-transparent bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
              : 'bg-background text-muted-foreground hover:text-foreground',
          )}
        >
          {t.needsAttention}
        </button>
      </div>
    </header>
  );
}
