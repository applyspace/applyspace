'use client';

import type { HubApplication } from '@/lib/applicationsHub';
import { useHubT, type HubT } from '@/lib/applicationsI18n';
import {
  eventsOf,
  flatEvents,
  monthKey,
  monthTicks,
  percentIn,
  rangeOf,
  type TimelineEvent,
  type TimelineEventType,
} from '@/lib/applicationsTimeline';
import { cn } from '@/lib/utils';
import { CompanyLogo } from './CompanyLogo';
import { STATUS_TONE } from './statusTone';
import { formatDay } from './dates';

const MARKER_TONE: Record<TimelineEventType, string> = {
  applied: 'bg-stone-400 dark:bg-stone-500',
  reply: 'bg-green-500',
  interview: 'bg-blue-500',
  deadline: 'bg-amber-500',
};

const label = (t: HubT, e: TimelineEvent) =>
  e.type === 'interview' && e.detail ? `${t.timeline.events.interview} - ${e.detail}` : t.timeline.events[e.type];

/** Applications on a time axis with their key dates. Desktop: one row per application. Mobile: a dated list. */
export function TimelineLayout({
  applications,
  now,
  onOpen,
}: {
  applications: HubApplication[];
  now: number;
  onOpen: (application: HubApplication) => void;
}) {
  const { t, locale } = useHubT();
  const rows = [...applications].sort((a, b) => b.appliedAt.localeCompare(a.appliedAt));
  const range = rangeOf(rows, now);
  const days = Math.ceil((range.end - range.start) / 86_400_000);
  const ticks = monthTicks(range);
  const monthName = (at: number) =>
    new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(at);
  const todayPercent = percentIn(range, now);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground" aria-label={t.timeline.legend}>
        {(Object.keys(MARKER_TONE) as TimelineEventType[]).map((type) => (
          <li key={type} className="flex items-center gap-1.5">
            <span className={cn('size-2.5 rounded-full', MARKER_TONE[type])} />
            {t.timeline.events[type]}
          </li>
        ))}
      </ul>

      {/* Desktop: axis with one row per application. */}
      <div className="hidden min-h-0 flex-1 overflow-auto rounded-2xl border md:block">
        <div className="w-full" style={{ minWidth: `${14 * 16 + days * 14}px` }}>
          <div className="sticky top-0 z-20 flex border-b bg-background">
            <div className="sticky left-0 z-10 w-56 shrink-0 bg-background" />
            <div className="relative h-9 flex-1">
              {ticks.map((tick) => (
                <span
                  key={tick.at}
                  className="absolute top-1/2 -translate-y-1/2 pl-2 text-xs text-muted-foreground"
                  style={{ left: `${tick.percent}%` }}
                >
                  {monthName(tick.at)}
                </span>
              ))}
            </div>
          </div>

          <div className="relative">
            {rows.map((a) => {
              const events = eventsOf(a);
              const first = events[0];
              const last = events[events.length - 1];
              return (
                <div key={a.id} className="flex border-b last:border-b-0">
                  <button
                    type="button"
                    onClick={() => onOpen(a)}
                    className="sticky left-0 z-10 flex w-56 shrink-0 items-center gap-2.5 bg-background px-4 py-3 text-left outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/30"
                  >
                    <CompanyLogo name={a.companyName} domain={a.companyDomain} className="size-8" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-foreground">{a.companyName}</span>
                      <span className="block truncate text-xs text-muted-foreground">{a.jobTitle}</span>
                    </span>
                  </button>
                  <div className="relative flex-1">
                    {ticks.map((tick) => (
                      <span key={tick.at} className="absolute inset-y-0 w-px bg-border/60" style={{ left: `${tick.percent}%` }} />
                    ))}
                    {first && last && first !== last && (
                      <span
                        className="absolute top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-border"
                        style={{
                          left: `${percentIn(range, first.at)}%`,
                          width: `${percentIn(range, last.at) - percentIn(range, first.at)}%`,
                        }}
                      />
                    )}
                    {events.map((e, i) => (
                      <button
                        key={`${e.type}-${i}`}
                        type="button"
                        onClick={() => onOpen(a)}
                        title={`${label(t, e)}: ${formatDay(e.at, locale)}`}
                        aria-label={`${a.companyName}, ${label(t, e)}, ${formatDay(e.at, locale)}`}
                        className={cn(
                          'absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-background outline-none focus-visible:ring-ring',
                          MARKER_TONE[e.type],
                        )}
                        style={{ left: `${percentIn(range, e.at)}%` }}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
            <div className="pointer-events-none absolute inset-y-0 left-56 right-0">
              <span className="absolute inset-y-0 w-px bg-primary/60" style={{ left: `${todayPercent}%` }}>
                <span className="absolute -top-0 left-1 rounded bg-primary px-1 text-[10px] font-medium text-primary-foreground">
                  {t.timeline.today}
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: dated events grouped by month. */}
      <MobileList applications={rows} onOpen={onOpen} />
    </div>
  );
}

function MobileList({
  applications,
  onOpen,
}: {
  applications: HubApplication[];
  onOpen: (application: HubApplication) => void;
}) {
  const { t, locale } = useHubT();
  const events = flatEvents(applications);
  const groups = new Map<string, typeof events>();
  for (const e of events) {
    const key = monthKey(e.at);
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }
  const monthName = (key: string) =>
    new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
      Date.parse(`${key}-01T00:00:00Z`),
    );

  return (
    <div className="flex flex-col gap-5 md:hidden">
      {[...groups.entries()].map(([key, items]) => (
        <section key={key} aria-label={monthName(key)} className="flex flex-col gap-2">
          <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{monthName(key)}</h2>
          <ul className="flex flex-col gap-1.5">
            {items.map((e, i) => (
              <li key={`${e.application.id}-${e.type}-${i}`}>
                <button
                  type="button"
                  onClick={() => onOpen(e.application)}
                  className="flex w-full items-center gap-3 rounded-xl border bg-card px-3 py-2.5 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
                >
                  <span className={cn('size-2.5 shrink-0 rounded-full', MARKER_TONE[e.type])} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">{e.application.companyName}</span>
                    <span className="block truncate text-xs text-muted-foreground">{label(t, e)}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatDay(e.at, locale)}</span>
                  <span className={cn('size-2 shrink-0 rounded-full', STATUS_TONE[e.application.status].dot)} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
