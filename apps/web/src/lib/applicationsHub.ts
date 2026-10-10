import type {
  ApplicationStatus,
  ApplicationWithRelations,
  InterviewOutcome,
  InterviewStage,
  InterviewWithRelations,
} from '@apply/core/applications';
import { entrySlug } from '@/lib/slug';

/**
 * Pure view model and helpers of the Applications hub (no React, no I/O).
 * Every layout (Board, Table, Timeline, Map) renders the same `HubApplication`
 * list, so filters and the peek behave the same in all of them.
 */

export const HUB_STATUSES: readonly ApplicationStatus[] = [
  'waiting',
  'interviewing',
  'accepted',
  'rejected',
  'ghosted',
  'withdrawn',
];

/** Statuses that count as finished: the application no longer needs action. */
export const CLOSED_STATUSES: readonly ApplicationStatus[] = ['rejected', 'ghosted', 'withdrawn'];

export const isClosed = (status: ApplicationStatus) => CLOSED_STATUSES.includes(status);

export type HubLayout = 'board' | 'table' | 'timeline' | 'map';
export const HUB_LAYOUTS: readonly HubLayout[] = ['board', 'table', 'timeline', 'map'];
export const DEFAULT_LAYOUT: HubLayout = 'board';

export function parseLayout(value: string | string[] | undefined | null): HubLayout {
  const v = Array.isArray(value) ? value[0] : value;
  return HUB_LAYOUTS.find((l) => l === v) ?? DEFAULT_LAYOUT;
}

export interface HubInterview {
  id: string;
  stage: InterviewStage;
  scheduledAt: string | null;
  completedAt: string | null;
  outcome: InterviewOutcome | null;
}

export interface HubApplication {
  id: string;
  slug: string;
  companyName: string;
  companyDomain: string | null;
  jobTitle: string;
  status: ApplicationStatus;
  appliedAt: string;
  /** Own location, else the offer's, else the company headquarters. */
  location: string | null;
  url: string | null;
  deadlineAt: string | null;
  respondedAt: string | null;
  notes: string | null;
  /** Soonest interview that is scheduled and not completed yet. */
  nextInterviewAt: string | null;
  interviews: HubInterview[];
}

const blankToNull = (value: string | null | undefined) => {
  const v = value?.trim();
  return v ? v : null;
};

export function toHubApplications(
  applications: ApplicationWithRelations[],
  interviews: InterviewWithRelations[],
): HubApplication[] {
  const byApplication = new Map<string, HubInterview[]>();
  for (const i of interviews) {
    const list = byApplication.get(i.applicationId) ?? [];
    list.push({
      id: i.id,
      stage: i.stage,
      scheduledAt: i.scheduledAt,
      completedAt: i.completedAt,
      outcome: i.outcome,
    });
    byApplication.set(i.applicationId, list);
  }

  return applications.map((a) => {
    const list = (byApplication.get(a.id) ?? []).sort((x, y) =>
      (x.scheduledAt ?? '').localeCompare(y.scheduledAt ?? ''),
    );
    const upcoming = list.find((i) => i.scheduledAt && !i.completedAt && i.outcome !== 'failed');
    return {
      id: a.id,
      slug: entrySlug([a.company.name, a.jobTitle], a.id),
      companyName: a.company.name,
      companyDomain: blankToNull(a.company.domain),
      jobTitle: a.jobTitle,
      status: a.status,
      appliedAt: a.appliedAt,
      location: blankToNull(a.location) ?? blankToNull(a.offer?.location) ?? blankToNull(a.company.headquarters),
      url: blankToNull(a.url) ?? blankToNull(a.offer?.url),
      deadlineAt: a.deadlineAt ?? null,
      respondedAt: a.respondedAt ?? null,
      notes: blankToNull(a.notes),
      nextInterviewAt: upcoming?.scheduledAt ?? null,
      interviews: list,
    };
  });
}

// --- time -----------------------------------------------------------------------

const DAY_MS = 86_400_000;

/** Whole days from `iso` to `now` (negative when `iso` is in the future). */
export function daysBetween(iso: string, now: number): number {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? 0 : Math.floor((now - t) / DAY_MS);
}

export const STALE_AFTER_DAYS = 14;
export const DEADLINE_WINDOW_DAYS = 7;

/** True when the application needs a look: waiting for a long time, or a deadline close by. */
export function needsAttention(app: HubApplication, now: number): boolean {
  if (isClosed(app.status) || app.status === 'accepted') return false;
  if (app.status === 'waiting' && daysBetween(app.appliedAt, now) >= STALE_AFTER_DAYS) return true;
  if (app.deadlineAt) {
    const until = -daysBetween(app.deadlineAt, now);
    return until >= 0 && until <= DEADLINE_WINDOW_DAYS;
  }
  return false;
}

// --- filters --------------------------------------------------------------------

export interface HubFilters {
  query: string;
  statuses: ApplicationStatus[];
  attention: boolean;
}

export const NO_FILTERS: HubFilters = { query: '', statuses: [], attention: false };

export const hasFilters = (f: HubFilters) => f.query.trim() !== '' || f.statuses.length > 0 || f.attention;

const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

export function applyFilters(apps: HubApplication[], f: HubFilters, now: number): HubApplication[] {
  const q = fold(f.query.trim());
  return apps.filter((a) => {
    if (f.statuses.length > 0 && !f.statuses.includes(a.status)) return false;
    if (f.attention && !needsAttention(a, now)) return false;
    if (q && !fold(`${a.companyName} ${a.jobTitle} ${a.location ?? ''}`).includes(q)) return false;
    return true;
  });
}

/** Applications of one status, newest application first. */
export const byStatus = (apps: HubApplication[], status: ApplicationStatus) =>
  apps.filter((a) => a.status === status).sort((x, y) => y.appliedAt.localeCompare(x.appliedAt));

export function countByStatus(apps: HubApplication[]): Record<ApplicationStatus, number> {
  const counts = Object.fromEntries(HUB_STATUSES.map((s) => [s, 0])) as Record<ApplicationStatus, number>;
  for (const a of apps) counts[a.status] += 1;
  return counts;
}
