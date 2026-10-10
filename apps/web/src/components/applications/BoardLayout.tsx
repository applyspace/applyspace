'use client';

import { useState } from 'react';
import type { ApplicationStatus } from '@apply/core/applications';
import { HUB_STATUSES, byStatus, countByStatus, isClosed, type HubApplication } from '@/lib/applicationsHub';
import { useHubT } from '@/lib/applicationsI18n';
import { cn } from '@/lib/utils';
import { ApplicationCard } from './ApplicationCard';
import { STATUS_TONE } from './statusTone';

/** One column per status. Cards move by drag and drop (desktop) or by their status menu (everywhere). */
export function BoardLayout({
  applications,
  now,
  onOpen,
  onMove,
}: {
  applications: HubApplication[];
  now: number;
  onOpen: (application: HubApplication) => void;
  onMove: (id: string, status: ApplicationStatus) => void;
}) {
  const { t } = useHubT();
  const [active, setActive] = useState<ApplicationStatus>('waiting');
  const [dragOver, setDragOver] = useState<ApplicationStatus | null>(null);
  const counts = countByStatus(applications);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {/* Mobile: one column at a time, picked from a status strip. */}
      <div role="tablist" aria-label={t.title} className="flex gap-1.5 overflow-x-auto md:hidden">
        {HUB_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={active === s}
            onClick={() => setActive(s)}
            className={cn(
              'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors',
              active === s ? 'border-transparent bg-primary text-primary-foreground' : 'bg-background text-muted-foreground',
            )}
          >
            {t.statusesShort[s]}
            <span className="tabular-nums opacity-70">{counts[s]}</span>
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto pb-4">
        {HUB_STATUSES.map((s) => {
          const items = byStatus(applications, s);
          return (
            <section
              key={s}
              aria-label={t.statuses[s]}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                setDragOver(s);
              }}
              onDragLeave={() => setDragOver((cur) => (cur === s ? null : cur))}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(null);
                const id = e.dataTransfer.getData('text/plain');
                const dropped = applications.find((a) => a.id === id);
                if (dropped && dropped.status !== s) onMove(id, s);
              }}
              className={cn(
                'min-w-0 flex-col rounded-2xl bg-muted/50 p-2 md:flex md:w-72 md:shrink-0',
                active === s ? 'flex w-full' : 'hidden',
                isClosed(s) && 'opacity-90',
                dragOver === s && 'ring-2 ring-ring/40',
              )}
            >
              <header className="flex items-center gap-2 px-2 py-1.5">
                <span className={cn('size-2 rounded-full', STATUS_TONE[s].dot)} />
                <h2 className="text-sm font-medium text-foreground">{t.statuses[s]}</h2>
                <span className="text-xs tabular-nums text-muted-foreground">{counts[s]}</span>
              </header>
              <div className="flex flex-col gap-2 overflow-y-auto p-0.5">
                {items.length === 0 ? (
                  <p className="rounded-xl border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
                    {t.emptyColumn}
                  </p>
                ) : (
                  items.map((a) => (
                    <ApplicationCard key={a.id} application={a} now={now} onOpen={onOpen} onMove={onMove} />
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
