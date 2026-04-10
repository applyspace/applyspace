import type { SearchCriteria } from '../../types.js';

const DEFAULT_TITLES = ['product designer', 'ux ui designer'];

// Maps app contractTypes to WTTJ contract_type values
const CONTRACT_MAP: Record<string, string> = {
  CDI: 'full_time',
  CDD: 'contractor',
  Freelance: 'freelance',
  Stage: 'internship',
  Alternance: 'apprenticeship',
};

// Maps app remotePreference to WTTJ remote values
const REMOTE_MAP: Record<string, string> = {
  remote: 'full',
  hybrid: 'partial',
  onsite: 'none',
};

export function buildUrls(criteria: SearchCriteria): string[] {
  const titles = criteria.titles.length > 0 ? criteria.titles : DEFAULT_TITLES;

  const contractTypes = criteria.contractTypes
    .map((c) => CONTRACT_MAP[c])
    .filter(Boolean);

  const remoteValues = criteria.remotePreference
    .map((r) => REMOTE_MAP[r])
    .filter(Boolean);

  return titles.map((title) => {
    const parts: string[] = [`query=${encodeURIComponent(title)}`, 'page=1', 'sortBy=mostRecent'];

    // Always filter by France
    parts.push('refinementList%5Boffices.country_code%5D%5B%5D=FR');

    for (const ct of contractTypes) {
      parts.push(`refinementList%5Bcontract_type%5D%5B%5D=${encodeURIComponent(ct)}`);
    }

    for (const rv of remoteValues) {
      parts.push(`refinementList%5Bremote%5D%5B%5D=${encodeURIComponent(rv)}`);
    }

    return `https://www.welcometothejungle.com/fr/jobs?${parts.join('&')}`;
  });
}
