import type { SearchCriteria } from '../../types.js';

const DEFAULT_TITLES = ['product designer', 'ux ui designer'];

export function buildUrls(criteria: SearchCriteria): string[] {
  const titles = criteria.titles.length > 0 ? criteria.titles : DEFAULT_TITLES;

  return titles.map((title) => {
    const params = new URLSearchParams({ query: title });
    return `https://jobs.makesense.org/jobs?${params.toString()}`;
  });
}
