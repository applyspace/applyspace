import type { SearchCriteria } from '../../types.js';

const DEFAULT_TITLES = ['product designer', 'ux ui designer'];

// Known geoIds for common locations — LinkedIn requires numeric IDs for accurate geo filtering
const GEO_ID_MAP: Record<string, string> = {
  'Paris, Île-de-France': '101240143',
  'Paris': '101240143',
  'France': '105015875',
  'Lyon': '104263761',
  'Bordeaux': '104045021',
  'Marseille': '102813943',
  'Toulouse': '100607929',
  'Nantes': '106356386',
  'Lille': '103855977',
};

// f_WT: 1=On-site, 2=Remote, 3=Hybrid
const REMOTE_MAP: Record<string, string> = {
  'Présentiel': '1',
  'onsite': '1',
  'À distance': '2',
  'remote': '2',
  'Hybride': '3',
  'hybrid': '3',
};

// f_JT: F=Full-time, P=Part-time, C=Contract, T=Temporary, I=Internship, V=Volunteer
const CONTRACT_MAP: Record<string, string> = {
  'CDI': 'F',
  'CDD': 'C',
  'Freelance': 'C',
  'Stage': 'I',
  'Alternance': 'I',
  'Bénévolat': 'V',
};

// f_E: 1=Internship, 2=Entry, 3=Associate, 4=Mid-Senior, 5=Director, 6=Executive
const EXPERIENCE_MAP: Record<string, string> = {
  'Junior': '2',
  'Confirmé': '3,4',
  'Senior': '4',
  'Director': '5',
  'Executive': '6',
};

export function buildUrls(criteria: SearchCriteria): string[] {
  const titles = criteria.titles.length > 0 ? criteria.titles : DEFAULT_TITLES;
  const location = criteria.location || 'Paris, Île-de-France';

  const geoId = GEO_ID_MAP[location];

  const remoteValues = criteria.remotePreference
    .flatMap((r) => (REMOTE_MAP[r] ?? '').split(','))
    .filter(Boolean);

  const contractValues = criteria.contractTypes
    .map((c) => CONTRACT_MAP[c])
    .filter(Boolean);

  const experienceValues = (criteria.experienceLevels ?? [])
    .flatMap((e) => (EXPERIENCE_MAP[e] ?? '').split(','))
    .filter(Boolean);

  // Deduplicate
  const fWT = [...new Set(remoteValues)].join(',');
  const fJT = [...new Set(contractValues)].join(',');
  const fE = [...new Set(experienceValues)].join(',');

  return titles.map((title) => {
    const params = new URLSearchParams({
      keywords: title,
      sortBy: 'DD',
      distance: '25',
      f_TPR: 'r604800', // last 7 days
    });

    if (geoId) {
      params.set('geoId', geoId);
      params.set('f_PP', geoId);
    } else {
      params.set('location', location);
    }

    if (fWT) params.set('f_WT', fWT);
    if (fJT) params.set('f_JT', fJT);
    if (fE) params.set('f_E', fE);

    return `https://www.linkedin.com/jobs/search/?${params.toString()}`;
  });
}
