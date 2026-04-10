import type { SearchCriteria } from '../../types.js';

const DEFAULT_TITLES = ['product designer', 'ux ui designer'];

export function buildUrls(criteria: SearchCriteria): string[] {
  const titles = criteria.titles.length > 0 ? criteria.titles : DEFAULT_TITLES;
  const location = criteria.location || 'France';

  return titles.map((title) => {
    const params = new URLSearchParams({
      k: title,
      l: location,
    });
    return `https://www.hellowork.com/fr-fr/emploi/recherche.html?${params.toString()}`;
  });
}
