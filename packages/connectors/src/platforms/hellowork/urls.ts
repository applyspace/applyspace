import type { BuiltUrl, SearchCriteria } from '../../types.js';

const ORIGIN = 'https://www.hellowork.com';

export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/['’]/g, '-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Dynamic search URL. `k` and `l` are verified (report: tested on `product designer`, `Paris`).
 * `teletravail=ouvert` is documented for this URL. `p` is documented for canonical listings and
 * assumed here. robots.txt disallows this path and any URL with a query string.
 */
export function buildHelloWorkSearchUrl(criteria: SearchCriteria, page = 1): BuiltUrl {
  const params: Record<string, string> = {};
  const keyword = criteria.jobTitles[0];
  if (keyword) params.k = keyword;
  const place = criteria.locations[0];
  if (place) params.l = place.postalCode ? `${place.label} ${place.postalCode}` : place.label;
  if (criteria.remoteModes.includes('remote') || criteria.remoteModes.includes('hybrid')) {
    params.teletravail = 'ouvert';
  }
  if (page > 1) params.p = String(page);
  const url = new URL('/fr-fr/emploi/recherche.html', ORIGIN);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const unverifiedParams = page > 1 ? ['p'] : [];
  return {
    url: url.toString(),
    params,
    unverified: unverifiedParams.length > 0,
    unverifiedParams,
    robotsDisallowed: true,
    notes: [
      'Sort, salary, distance, contract and publication-date filters exist on the site but their parameter names are not verified, so they are applied client-side (applyClientFilters).',
    ],
  };
}

export interface HelloWorkCanonicalInput {
  /** French job slug source, e.g. "développeur". `developer` is a 404 on the site. */
  jobSlug: string;
  city: string;
  /** Required: `ville_paris.html` is a 404, `ville_paris-75000.html` works. */
  postalCode: string;
  page?: number;
}

/** Canonical listing URL. Returns null when no postal code is known. */
export function buildHelloWorkCanonicalUrl(input: HelloWorkCanonicalInput): BuiltUrl | null {
  if (!/^\d{5}$/.test(input.postalCode)) return null;
  const path = `/fr-fr/emploi/metier_${slugify(input.jobSlug)}-ville_${slugify(input.city)}-${input.postalCode}.html`;
  const url = new URL(path, ORIGIN);
  const params: Record<string, string> = {};
  if (input.page && input.page > 1) {
    params.p = String(input.page);
    url.searchParams.set('p', params.p);
  }
  return {
    url: url.toString(),
    params,
    unverified: false,
    unverifiedParams: [],
    robotsDisallowed: Object.keys(params).length > 0,
    notes: ['Job slug must be French; the page 404s otherwise. Stop at a 404 or when only repeated ids come back.'],
  };
}

export function buildHelloWorkDetailUrl(id: string): string {
  return `${ORIGIN}/fr-fr/emplois/${encodeURIComponent(id)}.html`;
}
