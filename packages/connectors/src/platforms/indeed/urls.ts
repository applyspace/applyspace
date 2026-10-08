import type { BuiltUrl, SearchCriteria } from '../../types.js';

export const INDEED_DEFAULT_HOST = 'fr.indeed.com';
/** Offset step for `start`. Unverified (report). */
export const INDEED_PAGE_SIZE = 10;

const FROMAGE_STEPS = [1, 3, 7, 14] as const;

/** Snaps to the documented `fromage` values (1, 3, 7, 14), rounding up; null above 14. */
export function fromageFor(days: number | undefined): number | null {
  if (!days || days <= 0) return null;
  return FROMAGE_STEPS.find((s) => days <= s) ?? null;
}

export interface IndeedSearchOptions {
  host?: string;
  /**
   * Raw filter parameters (`jt`, `remotejob`, salary...) whose encoded values are not verified.
   * Passed through untouched; the probe records which ones the site actually produces.
   */
  extra?: Record<string, string>;
}

/**
 * Search URL on `/jobs`. `q`, `l`, `radius`, `sort`, `fromage` are verified through the French
 * scraper documentation; `start` is unverified. `radius` is sent as given (km in that doc).
 * `/jobs` is allowed by robots.txt but the site is guarded by anti-bot measures: use it from the
 * user's own browser only.
 */
export function buildIndeedSearchUrl(
  criteria: SearchCriteria,
  page = 1,
  options: IndeedSearchOptions = {},
): BuiltUrl {
  const params: Record<string, string> = {};
  const keyword = criteria.jobTitles[0];
  if (keyword) params.q = keyword;
  const place = criteria.locations[0];
  if (place) params.l = place.label;
  if (criteria.radiusKm) params.radius = String(Math.round(criteria.radiusKm));
  if (criteria.sort) params.sort = criteria.sort;
  const fromage = fromageFor(criteria.postedWithinDays);
  if (fromage) params.fromage = String(fromage);
  const unverifiedParams: string[] = [];
  if (page > 1) {
    params.start = String((page - 1) * INDEED_PAGE_SIZE);
    unverifiedParams.push('start');
  }
  for (const [k, v] of Object.entries(options.extra ?? {})) {
    params[k] = v;
    unverifiedParams.push(k);
  }
  const url = new URL(`https://${options.host ?? INDEED_DEFAULT_HOST}/jobs`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const notes: string[] = [];
  if (criteria.postedWithinDays && !fromage) {
    notes.push('postedWithinDays above 14 has no fromage value; filter client-side.');
  }
  return { url: url.toString(), params, unverified: unverifiedParams.length > 0, unverifiedParams, robotsDisallowed: false, notes };
}

/** `/viewjob` is disallowed by robots.txt: only open it in the user's own browser. */
export function buildIndeedDetailUrl(jobKey: string, host = INDEED_DEFAULT_HOST): BuiltUrl {
  const url = new URL(`https://${host}/viewjob`);
  url.searchParams.set('jk', jobKey);
  return {
    url: url.toString(),
    params: { jk: jobKey },
    unverified: true,
    unverifiedParams: ['jk'],
    robotsDisallowed: true,
    notes: ['/viewjob is disallowed in robots.txt (report).'],
  };
}
