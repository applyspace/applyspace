import type { BuiltUrl, SearchCriteria } from '../../types.js';

/** Sitemap index listing job pages, the route that stays within robots.txt. */
export const WTTJ_SITEMAP_INDEX = 'https://www.welcometothejungle.com/sitemaps/index.xml.gz';

const WEB_ORIGIN = 'https://www.welcometothejungle.com';

/**
 * Search request in the vocabulary of the third-party scraper documented in the report
 * (`queries`, `countryCodes`, `cities`, ...). Enum values are NOT verified. The host sends it to
 * the search-only index that visitors' browsers use; the probe reveals the real endpoint.
 */
export interface WttjSearchRequest {
  queries: string[];
  countryCodes: string[];
  cities: string[];
  contractTypes: string[];
  remotePolicies: string[];
  languages: string[];
  searchTitleOnly: boolean;
  postedWithinDays: number;
  page: number;
  unverified: true;
}

// Values are guesses from the report (permanent, temporary, internship, freelance).
const CONTRACTS: Record<string, string> = {
  permanent: 'permanent',
  fixed_term: 'temporary',
  internship: 'internship',
  freelance: 'freelance',
  apprenticeship: 'apprenticeship',
  part_time: 'part_time',
  temporary: 'temporary',
};

const REMOTE: Record<string, string> = { remote: 'fulltime', hybrid: 'partial' };

export function buildWttjSearchRequest(criteria: SearchCriteria, page = 1): WttjSearchRequest {
  const place = criteria.locations[0];
  return {
    queries: criteria.jobTitles.slice(0, 1),
    countryCodes: [place?.countryCode ?? 'FR'],
    cities: place ? [place.label] : [],
    contractTypes: criteria.contractTypes.map((c) => CONTRACTS[c]).filter((c): c is string => !!c),
    remotePolicies: criteria.remoteModes.map((m) => REMOTE[m]).filter((m): m is string => !!m),
    languages: [],
    searchTitleOnly: false,
    postedWithinDays: criteria.postedWithinDays ?? 0,
    page,
    unverified: true,
  };
}

/**
 * Website search URL. Parameter names (`query`, `page`, `refinementList[...]`) are unverified
 * and robots.txt disallows any URL with a query string, so this exists for the probe only.
 */
export function buildWttjWebSearchUrl(criteria: SearchCriteria, page = 1): BuiltUrl {
  const params: Record<string, string> = {};
  const keyword = criteria.jobTitles[0];
  if (keyword) params.query = keyword;
  const place = criteria.locations[0];
  if (place) params['refinementList[offices.city][]'] = place.label;
  const remote = criteria.remoteModes.map((m) => REMOTE[m]).find(Boolean);
  if (remote) params['refinementList[remote][]'] = remote;
  if (page > 1) params.page = String(page);
  const url = new URL('/fr/jobs', WEB_ORIGIN);
  for (const [k, v] of Object.entries(params)) url.searchParams.append(k, v);
  return {
    url: url.toString(),
    params,
    unverified: true,
    unverifiedParams: Object.keys(params),
    robotsDisallowed: true,
    notes: ['Parameter names unverified (report, section Welcome to the Jungle).'],
  };
}
