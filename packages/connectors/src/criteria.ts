import type {
  ContractType,
  ExperienceLevel,
  RemoteMode,
  SearchCriteria,
  SearchLocation,
} from './types.js';

/**
 * Columns of the saved first search profile (`public.searches`, onboarding v2 migration).
 * `locations` is a jsonb array of `{ label, ... }`.
 */
export interface SearchProfileRow {
  job_titles?: string[] | null;
  locations?: unknown;
  remote_modes?: string[] | null;
  contract_types?: string[] | null;
  experience_levels?: string[] | null;
  salary_min?: number | null;
  salary_currency?: string | null;
}

const CONTRACT_MAP: Record<string, ContractType> = {
  cdi: 'permanent',
  cdd: 'fixed_term',
  stage: 'internship',
  freelance: 'freelance',
  apprentissage: 'apprenticeship',
  alternance: 'apprenticeship',
  benevolat: 'volunteer',
  bénévolat: 'volunteer',
};

const REMOTE_VALUES: readonly RemoteMode[] = ['onsite', 'hybrid', 'remote'];
const EXPERIENCE_VALUES: readonly ExperienceLevel[] = ['entry', 'mid', 'senior', 'lead'];

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function mapLocations(raw: unknown): SearchLocation[] {
  if (!Array.isArray(raw)) return [];
  const out: SearchLocation[] = [];
  for (const item of raw) {
    if (typeof item === 'string' && item.trim()) {
      out.push({ label: item.trim() });
    } else if (item && typeof item === 'object') {
      const o = item as Record<string, unknown>;
      const label = typeof o.label === 'string' ? o.label.trim() : '';
      if (!label) continue;
      const loc: SearchLocation = { label };
      if (typeof o.countryCode === 'string') loc.countryCode = o.countryCode.toUpperCase();
      else if (typeof o.country_code === 'string') loc.countryCode = o.country_code.toUpperCase();
      if (typeof o.postalCode === 'string') loc.postalCode = o.postalCode;
      else if (typeof o.postal_code === 'string') loc.postalCode = o.postal_code;
      out.push(loc);
    }
  }
  return out;
}

/** Maps the saved first search profile columns to platform independent criteria. */
export function searchCriteriaFromProfile(row: SearchProfileRow): SearchCriteria {
  const criteria: SearchCriteria = {
    jobTitles: unique((row.job_titles ?? []).map((t) => t.trim()).filter(Boolean)),
    locations: mapLocations(row.locations),
    remoteModes: unique(
      (row.remote_modes ?? []).filter((m): m is RemoteMode =>
        (REMOTE_VALUES as readonly string[]).includes(m),
      ),
    ),
    contractTypes: unique(
      (row.contract_types ?? [])
        .map((c) => CONTRACT_MAP[c.trim().toLowerCase()])
        .filter((c): c is ContractType => c !== undefined),
    ),
    experienceLevels: unique(
      (row.experience_levels ?? []).filter((l): l is ExperienceLevel =>
        (EXPERIENCE_VALUES as readonly string[]).includes(l),
      ),
    ),
  };
  if (typeof row.salary_min === 'number' && row.salary_min > 0) {
    criteria.salaryMin = row.salary_min;
    criteria.salaryCurrency = row.salary_currency ?? 'EUR';
  }
  return criteria;
}

/**
 * Connectors search one title in one place per call. This fans a criteria object out into one
 * criteria per (title x location). With no location, a single location-less query is returned.
 */
export function splitCriteria(criteria: SearchCriteria): SearchCriteria[] {
  const titles = criteria.jobTitles.length ? criteria.jobTitles : [''];
  const places = criteria.locations.length ? criteria.locations : [];
  const out: SearchCriteria[] = [];
  for (const title of titles) {
    if (!places.length) {
      out.push({ ...criteria, jobTitles: title ? [title] : [], locations: [] });
      continue;
    }
    for (const place of places) {
      out.push({ ...criteria, jobTitles: title ? [title] : [], locations: [place] });
    }
  }
  return out;
}
