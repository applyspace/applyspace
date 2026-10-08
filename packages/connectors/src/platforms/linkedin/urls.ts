import type {
  BuiltUrl,
  ContractType,
  ExperienceLevel,
  RemoteMode,
  SearchCriteria,
} from '../../types.js';

export const LINKEDIN_PAGE_SIZE = 25;
const SEARCH_PAGE = 'https://www.linkedin.com/jobs/search/';
/** Path from the report, flagged unverified there. */
const GUEST_API = 'https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search';

/** `f_E`: 1 Internship, 2 Entry, 3 Associate, 4 Mid-Senior, 5 Director, 6 Executive. */
const EXPERIENCE: Record<ExperienceLevel, string[]> = {
  entry: ['1', '2'],
  mid: ['3', '4'],
  senior: ['4'],
  lead: ['5', '6'],
};

/** `f_JT`: F full-time, P part-time, C contract, T temporary, V volunteer, I internship, O other. */
const CONTRACT: Record<ContractType, string[]> = {
  permanent: ['F'],
  fixed_term: ['C'],
  internship: ['I'],
  // LinkedIn has no apprenticeship type; work-study offers are usually posted as internship or contract.
  apprenticeship: ['I', 'C'],
  freelance: ['C'],
  part_time: ['P'],
  temporary: ['T'],
  volunteer: ['V'],
  other: ['O'],
};

/** `f_WT`: 1 On-site, 2 Remote, 3 Hybrid. */
const WORK_TYPE: Record<RemoteMode, string> = { onsite: '1', remote: '2', hybrid: '3' };

const KM_PER_MILE = 1.609344;

function uniqueJoin(values: string[][]): string {
  return [...new Set(values.flat())].join(',');
}

export interface LinkedInSearchOptions {
  /** Use the guest "seeMoreJobPostings" endpoint (unverified) instead of the search page. */
  guestApi?: boolean;
  /** Known LinkedIn geo id; when set it is sent next to `location`. */
  geoId?: string;
}

/**
 * Public guest search URL (no login). `distance` is in MILES, so `radiusKm` is converted.
 * `f_TPR` is `r` + seconds. 25 results per page, `start` is the offset. The guest endpoint path
 * is unverified. No salary filter exists in the public search.
 */
export function buildLinkedInSearchUrl(
  criteria: SearchCriteria,
  page = 1,
  options: LinkedInSearchOptions = {},
): BuiltUrl {
  const params: Record<string, string> = {};
  const keyword = criteria.jobTitles[0];
  if (keyword) params.keywords = keyword;
  const place = criteria.locations[0];
  if (place) params.location = place.label;
  if (options.geoId) params.geoId = options.geoId;
  if (criteria.radiusKm) params.distance = String(Math.max(1, Math.round(criteria.radiusKm / KM_PER_MILE)));
  if (criteria.postedWithinDays && criteria.postedWithinDays > 0) {
    params.f_TPR = `r${Math.round(criteria.postedWithinDays * 86_400)}`;
  }
  if (criteria.experienceLevels.length) {
    params.f_E = uniqueJoin(criteria.experienceLevels.map((l) => EXPERIENCE[l]));
  }
  if (criteria.contractTypes.length) {
    params.f_JT = uniqueJoin(criteria.contractTypes.map((c) => CONTRACT[c]));
  }
  if (criteria.remoteModes.length) {
    params.f_WT = [...new Set(criteria.remoteModes.map((m) => WORK_TYPE[m]))].join(',');
  }
  if (criteria.sort) params.sortBy = criteria.sort === 'date' ? 'DD' : 'R';
  if (page > 1) params.start = String((page - 1) * LINKEDIN_PAGE_SIZE);
  const url = new URL(options.guestApi ? GUEST_API : SEARCH_PAGE);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const unverifiedParams = options.guestApi ? ['(endpoint path)'] : [];
  const notes = [
    'Salary is not available in the public search; salaryMin is applied client-side only if a platform shows it.',
    'Mid-Senior (4) is searched for both mid and senior.',
  ];
  if (criteria.salaryMin) notes.push('salaryMin ignored: LinkedIn guest search has no salary filter.');
  return {
    url: url.toString(),
    params,
    unverified: unverifiedParams.length > 0,
    unverifiedParams,
    robotsDisallowed: false,
    notes,
  };
}

/** Public job page. Path assumed from the job id; not verified in the report. */
export function buildLinkedInDetailUrl(jobId: string): BuiltUrl {
  return {
    url: `https://www.linkedin.com/jobs/view/${encodeURIComponent(jobId)}`,
    params: {},
    unverified: true,
    unverifiedParams: ['(path)'],
    robotsDisallowed: false,
    notes: ['LinkedIn terms forbid automated extraction; guest mode from the user\'s own browser only.'],
  };
}
