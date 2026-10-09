import type { Company, Offer, Platform, Profile, Search, Contract, RemoteMode } from '@apply/db/schema';
import type { OfferWithRelations } from '@apply/core/offers';
import snapshot from '@/data/demo-offers.json';
import { labelsFromExperienceLevels, toK } from '@/lib/settings-mapping';
import type { AppSettings } from '@/lib/settings';

/**
 * Demo content for the hosted version, served from memory (no database): one
 * search profile ("Product Designer", mid-level, WTTJ), the four platforms and
 * the offers from a committed snapshot of that search.
 *
 * The snapshot is produced by `pnpm --filter @apply/scraper demo:snapshot`
 * (no account needed) so the public demo never calls WTTJ at request time.
 * Read-only: the demo never saves anything.
 */

const DEMO_PROFILE_ID = 'demo-profile';
const DEMO_SEARCH_ID = 'demo-search';
const NOW = '2026-01-01T00:00:00.000Z';

interface SnapshotJob {
  id: string;
  title: string;
  company: string;
  location?: string;
  contract?: string;
  salary?: string;
  description?: string;
  url: string;
  postedAt?: string;
  scrapedAt?: string;
}

const CONTRACTS: readonly string[] = ['CDI', 'CDD', 'Stage', 'Freelance', 'Apprentissage'];

function toContract(raw: string | undefined): Contract | null {
  return raw && CONTRACTS.includes(raw) ? (raw as Contract) : null;
}

function toRemoteMode(location: string): RemoteMode | null {
  const l = location.toLowerCase();
  if (l.includes('hybride') || l.includes('hybrid')) return 'hybrid';
  if (l.includes('sur site') || l.includes('onsite')) return 'onsite';
  if (l.includes('distance') || l.includes('remote') || l.includes('télétravail')) return 'remote';
  return null;
}

/** "45K à 60K €" → { min: 45000, max: 60000 } (best effort, raw kept alongside). */
function toSalary(raw: string | undefined): { min: number | null; max: number | null } {
  if (!raw) return { min: null, max: null };
  const nums = [...raw.toLowerCase().replace(/\s+/g, '').matchAll(/(\d{2,3})k/g)].map(
    (m) => Number(m[1]) * 1000,
  );
  return { min: nums[0] ?? null, max: nums[1] ?? null };
}

// Mirrors the platforms seeded by `runSeed()` in packages/db/src/seed.ts.
const PLATFORMS: Platform[] = [
  { slug: 'hellowork', label: 'HelloWork', brandColor: '#FD3345', loginUrl: 'https://www.hellowork.com/fr-fr/candidat/login.html' },
  { slug: 'jobsthatmakesense', label: 'JobsThatMakeSense', brandColor: '#006A4E', loginUrl: 'https://www.jobs_that_makesense.org/fr/login' },
  { slug: 'linkedin', label: 'LinkedIn', brandColor: '#0A66C2', loginUrl: 'https://www.linkedin.com/login' },
  { slug: 'wttj', label: 'Welcome to the Jungle', brandColor: '#FFC619', loginUrl: 'https://www.welcometothejungle.com/fr/signin' },
];

const PROFILE: Profile = {
  id: DEMO_PROFILE_ID,
  jobTitle: 'Product Designer',
  isDefault: true,
  description: null,
  createdAt: NOW,
  updatedAt: NOW,
};

const SEARCH: Search = {
  id: DEMO_SEARCH_ID,
  profileId: DEMO_PROFILE_ID,
  searchTitle: 'Product Designer',
  location: 'France',
  contractTypes: ['CDI'],
  experienceLevels: ['mid'],
  remoteMode: null,
  salaryMinEur: null,
  salaryMaxEur: null,
  enabledPlatforms: ['wttj'],
  createdAt: NOW,
  updatedAt: NOW,
};

function buildContent(): { companies: Company[]; offers: OfferWithRelations[] } {
  const wttj = PLATFORMS.find((p) => p.slug === 'wttj')!;
  const companies = new Map<string, Company>();
  const offers: OfferWithRelations[] = [];

  for (const job of snapshot.jobs as SnapshotJob[]) {
    const name = job.company?.trim();
    if (!name || !job.url || !job.title) continue;

    let company = companies.get(name);
    if (!company) {
      company = {
        id: `demo-company-${companies.size + 1}`,
        name,
        domain: null,
        linkedinHandle: null,
        sector: null,
        size: null,
        headquarters: null,
        description: null,
        logoUrl: null,
        createdAt: NOW,
        updatedAt: NOW,
      };
      companies.set(name, company);
    }

    const salary = toSalary(job.salary);
    const seenAt = job.scrapedAt ?? snapshot.scrapedAt ?? NOW;
    const offer: Offer = {
      id: `demo-offer-${job.id}`,
      platformSlug: 'wttj',
      companyId: company.id,
      externalId: job.id,
      url: job.url,
      title: job.title,
      location: job.location ?? '',
      remoteMode: toRemoteMode(job.location ?? ''),
      contract: toContract(job.contract),
      experienceLevel: 'mid',
      salaryMinEur: salary.min,
      salaryMaxEur: salary.max,
      salaryRaw: job.salary ?? null,
      description: job.description ?? '',
      descriptionHtml: null,
      postedAt: job.postedAt ?? null,
      firstSeenAt: seenAt,
      lastSeenAt: seenAt,
      userStatus: 'new',
      createdAt: NOW,
      updatedAt: NOW,
    };
    offers.push({ ...offer, company, platform: wttj });
  }

  offers.sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt));
  return {
    companies: [...companies.values()].sort((a, b) => a.name.localeCompare(b.name)),
    offers,
  };
}

const CONTENT = buildContent();

export const demoPlatforms = (): Platform[] => PLATFORMS;
export const demoProfiles = (): Profile[] => [PROFILE];
export const demoSearches = (): Search[] => [SEARCH];
export const demoCompanies = (): Company[] => CONTENT.companies;
export const demoOffers = (): OfferWithRelations[] => CONTENT.offers;

export function demoSettings(): AppSettings {
  return {
    firstName: '',
    lastName: '',
    jobTitle: PROFILE.jobTitle,
    location: SEARCH.location ?? '',
    availability: '',
    searchTitles: [SEARCH.searchTitle],
    contractTypes: [...(SEARCH.contractTypes ?? [])],
    experienceLevels: labelsFromExperienceLevels(SEARCH.experienceLevels ?? null),
    searchLocation: SEARCH.location ?? '',
    companySizes: [],
    salaryMin: toK(SEARCH.salaryMinEur),
    salaryMax: toK(SEARCH.salaryMaxEur),
    remotePreference: [],
    noGos: [],
  };
}
