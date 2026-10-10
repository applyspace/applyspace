'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import { Calendar03Icon, Location06Icon, Clock01Icon } from '@hugeicons/core-free-icons';
import type { ApplicationStatus } from '@apply/core/applications';
import { daysBetween, needsAttention, type HubApplication } from '@/lib/applicationsHub';
import { useHubT } from '@/lib/applicationsI18n';
import { cn } from '@/lib/utils';
import { CompanyLogo } from './CompanyLogo';
import { StatusMenu } from './StatusMenu';
import { formatDay } from './dates';

export function ApplicationCard({
  application,
  now,
  onOpen,
  onMove,
}: {
  application: HubApplication;
  now: number;
  onOpen: (application: HubApplication) => void;
  onMove: (id: string, status: ApplicationStatus) => void;
}) {
  const { t, locale } = useHubT();
  const a = application;
  const days = daysBetween(a.appliedAt, now);
  const applied = days <= 0 ? t.today : t.daysAgo(days);
  const attention = needsAttention(a, now);

  return (
    <article
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', a.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      className="group relative cursor-grab rounded-2xl border bg-card p-3.5 text-card-foreground transition-shadow hover:shadow-sm active:cursor-grabbing"
    >
      <StatusMenu
        status={a.status}
        onSelect={(s) => onMove(a.id, s)}
        className="absolute top-2.5 right-2.5 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100 md:data-popup-open:opacity-100"
      />
      <button
        type="button"
        onClick={() => onOpen(a)}
        className="flex w-full min-w-0 flex-col gap-3 rounded-xl text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
      >
        <span className="flex items-center gap-2.5 pr-7">
          <CompanyLogo name={a.companyName} domain={a.companyDomain} />
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-foreground">{a.companyName}</span>
            <span className="block truncate text-sm text-muted-foreground">{a.jobTitle}</span>
          </span>
        </span>

        <span className="flex flex-col gap-1.5 text-xs text-muted-foreground">
          {a.location && (
            <span className="flex items-center gap-1.5">
              <HugeiconsIcon icon={Location06Icon} size={13} className="shrink-0" />
              <span className="truncate">{a.location}</span>
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <HugeiconsIcon icon={Clock01Icon} size={13} className="shrink-0" />
            {t.appliedOn} {applied}
          </span>
        </span>

        {(a.nextInterviewAt || a.deadlineAt) && (
          <span className="flex flex-wrap gap-1.5">
            {a.nextInterviewAt && (
              <span className="inline-flex h-6 items-center gap-1 rounded-full bg-blue-50 px-2 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                <HugeiconsIcon icon={Calendar03Icon} size={12} />
                {t.interview} {formatDay(a.nextInterviewAt, locale)}
              </span>
            )}
            {a.deadlineAt && (
              <span
                className={cn(
                  'inline-flex h-6 items-center gap-1 rounded-full px-2 text-xs font-medium',
                  attention
                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {t.deadline} {formatDay(a.deadlineAt, locale)}
              </span>
            )}
          </span>
        )}
      </button>
    </article>
  );
}
