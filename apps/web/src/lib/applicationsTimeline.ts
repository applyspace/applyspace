import type { HubApplication } from '@/lib/applicationsHub';

/** Pure helpers of the Timeline layout (no React, no I/O). */

export type TimelineEventType = 'applied' | 'reply' | 'interview' | 'deadline';

export interface TimelineEvent {
  type: TimelineEventType;
  /** ISO date or date-time. */
  at: string;
  /** Interview stage, when the event is an interview. */
  detail?: string;
}

const DAY_MS = 86_400_000;

const valid = (iso: string | null): iso is string => iso !== null && !Number.isNaN(Date.parse(iso));

/** Key dates of one application, oldest first. */
export function eventsOf(app: HubApplication): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  if (valid(app.appliedAt)) events.push({ type: 'applied', at: app.appliedAt });
  if (valid(app.respondedAt)) events.push({ type: 'reply', at: app.respondedAt });
  for (const i of app.interviews) {
    if (valid(i.scheduledAt)) events.push({ type: 'interview', at: i.scheduledAt, detail: i.stage });
  }
  if (valid(app.deadlineAt)) events.push({ type: 'deadline', at: app.deadlineAt });
  return events.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}

export interface TimelineRange {
  start: number;
  end: number;
}

/** Time span that holds every event and today, padded by a few days, at least 30 days wide. */
export function rangeOf(apps: HubApplication[], now: number): TimelineRange {
  let min = now;
  let max = now;
  for (const a of apps) {
    for (const e of eventsOf(a)) {
      const t = Date.parse(e.at);
      if (t < min) min = t;
      if (t > max) max = t;
    }
  }
  const pad = 3 * DAY_MS;
  let start = min - pad;
  let end = max + pad;
  if (end - start < 30 * DAY_MS) {
    const missing = 30 * DAY_MS - (end - start);
    start -= missing / 2;
    end += missing / 2;
  }
  return { start, end };
}

/** Position of a date inside the range, as a percentage from 0 to 100. */
export function percentIn(range: TimelineRange, iso: string | number): number {
  const t = typeof iso === 'number' ? iso : Date.parse(iso);
  return Math.min(100, Math.max(0, ((t - range.start) / (range.end - range.start)) * 100));
}

export interface MonthTick {
  /** First day of the month, ms. */
  at: number;
  percent: number;
}

/** First day of each month that falls inside the range (UTC). */
export function monthTicks(range: TimelineRange): MonthTick[] {
  const ticks: MonthTick[] = [];
  const first = new Date(range.start);
  let year = first.getUTCFullYear();
  let month = first.getUTCMonth() + 1;
  for (;;) {
    const at = Date.UTC(year, month, 1);
    if (at >= range.end) break;
    ticks.push({ at, percent: percentIn(range, at) });
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }
  return ticks;
}

/** "2026-10" style key used to group the mobile list by month. */
export const monthKey = (iso: string) => iso.slice(0, 7);

export interface FlatEvent extends TimelineEvent {
  application: HubApplication;
}

/** Every event of every application as one chronological list (mobile layout). */
export function flatEvents(apps: HubApplication[]): FlatEvent[] {
  return apps
    .flatMap((application) => eventsOf(application).map((e) => ({ ...e, application })))
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}
