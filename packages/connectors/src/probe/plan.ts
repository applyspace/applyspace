import { splitCriteria } from '../criteria.js';
import { buildHelloWorkSearchUrl } from '../platforms/hellowork/urls.js';
import { buildIndeedSearchUrl } from '../platforms/indeed/urls.js';
import { buildLinkedInSearchUrl } from '../platforms/linkedin/urls.js';
import { buildWttjWebSearchUrl } from '../platforms/wttj/urls.js';
import type { BuiltUrl, Platform, SearchCriteria, SortOrder } from '../types.js';
import { MATRIX, MAX_PAGES_PER_RUN } from './config.js';

export interface PlannedLoad {
  kind: 'listing' | 'detail';
  /** Listing page number (1-indexed) or detail index. */
  page: number;
  built: BuiltUrl;
  criteriaLabel: string;
}

export function buildListingUrl(platform: Platform, criteria: SearchCriteria, page: number): BuiltUrl {
  switch (platform) {
    case 'wttj':
      return buildWttjWebSearchUrl(criteria, page);
    case 'hellowork':
      return buildHelloWorkSearchUrl(criteria, page);
    case 'indeed':
      return buildIndeedSearchUrl(criteria, page);
    case 'linkedin':
      return buildLinkedInSearchUrl(criteria, page);
  }
}

export function clampPages(requested: number, details = 0): { pages: number; details: number } {
  const pages = Math.min(Math.max(Math.floor(requested) || 1, 1), MAX_PAGES_PER_RUN);
  const budget = MAX_PAGES_PER_RUN - pages;
  return { pages, details: Math.min(Math.max(Math.floor(details) || 0, 0), budget) };
}

export function criteriaLabel(c: SearchCriteria): string {
  const place = c.locations[0]?.label ?? (c.remoteModes.includes('remote') ? 'remote' : 'anywhere');
  return `${c.jobTitles[0] ?? '*'} / ${place} / ${c.sort ?? 'relevance'}`;
}

export function planListings(platform: Platform, criteria: SearchCriteria, pages: number): PlannedLoad[] {
  const label = criteriaLabel(criteria);
  return Array.from({ length: pages }, (_, i) => ({
    kind: 'listing' as const,
    page: i + 1,
    built: buildListingUrl(platform, criteria, i + 1),
    criteriaLabel: label,
  }));
}

/** The test matrix of the report: 3 job titles x 4 places x 2 sort orders. */
export function matrixCriteria(): SearchCriteria[] {
  const out: SearchCriteria[] = [];
  for (const title of MATRIX.titles) {
    for (const place of MATRIX.places) {
      for (const sort of MATRIX.sorts) {
        out.push({
          jobTitles: [title],
          locations: place ? [{ label: place, countryCode: 'FR' }] : [{ label: 'France', countryCode: 'FR' }],
          remoteModes: place ? [] : ['remote'],
          contractTypes: [],
          experienceLevels: [],
          sort: sort as SortOrder,
        });
      }
    }
  }
  return out;
}

/** Matrix runs as lists of loads (one run per combination), dropping runs with an identical first URL. */
export function planMatrix(platform: Platform, pages: number): { runs: PlannedLoad[][]; skipped: string[] } {
  const seen = new Set<string>();
  const runs: PlannedLoad[][] = [];
  const skipped: string[] = [];
  for (const c of matrixCriteria()) {
    const plan = planListings(platform, c, pages);
    const first = plan[0]?.built.url;
    if (!first) continue;
    if (seen.has(first)) {
      skipped.push(`${criteriaLabel(c)}: same URL as an earlier combination (sort not expressible in the URL)`);
      continue;
    }
    seen.add(first);
    runs.push(plan);
  }
  return { runs, skipped };
}

export function criteriaFromArgs(args: {
  query?: string;
  location?: string;
  sort?: SortOrder;
  remote?: boolean;
}): SearchCriteria {
  const base: SearchCriteria = {
    jobTitles: args.query ? [args.query] : [],
    locations: args.location ? [{ label: args.location, countryCode: 'FR' }] : [],
    remoteModes: args.remote ? ['remote'] : [],
    contractTypes: [],
    experienceLevels: [],
  };
  if (args.sort) base.sort = args.sort;
  return splitCriteria(base)[0] ?? base;
}
