import { describe, expect, it } from 'vitest';
import { createLinkedInConnector } from '../src/platforms/linkedin/index.js';
import { cleanLinkedInUrl, parseLinkedInDetail, parseLinkedInGuestCards } from '../src/platforms/linkedin/parse.js';
import { buildLinkedInDetailUrl, buildLinkedInSearchUrl } from '../src/platforms/linkedin/urls.js';
import type { SearchCriteria } from '../src/types.js';
import { NOW, fixture } from './helpers.js';

const criteria: SearchCriteria = {
  jobTitles: ['product designer'],
  locations: [{ label: 'Paris' }],
  remoteModes: ['remote', 'hybrid'],
  contractTypes: ['permanent', 'internship'],
  experienceLevels: ['entry', 'mid'],
  radiusKm: 40,
  postedWithinDays: 7,
  sort: 'date',
  salaryMin: 50000,
};

describe('LinkedIn urls', () => {
  it('builds the documented filters', () => {
    const built = buildLinkedInSearchUrl(criteria, 3);
    expect(built.params).toEqual({
      keywords: 'product designer',
      location: 'Paris',
      distance: '25',
      f_TPR: 'r604800',
      f_E: '1,2,3,4',
      f_JT: 'F,I',
      f_WT: '2,3',
      sortBy: 'DD',
      start: '50',
    });
    expect(built.url.startsWith('https://www.linkedin.com/jobs/search/?')).toBe(true);
    expect(built.unverified).toBe(false);
    expect(built.notes.join(' ')).toContain('salaryMin ignored');
  });

  it('flags the guest api endpoint as unverified', () => {
    const built = buildLinkedInSearchUrl(criteria, 1, { guestApi: true, geoId: '105015875' });
    expect(built.url).toContain('/jobs-guest/jobs/api/seeMoreJobPostings/search?');
    expect(built.params.geoId).toBe('105015875');
    expect(built.unverified).toBe(true);
    expect(built.params.start).toBeUndefined();
  });

  it('converts hours-level windows to seconds', () => {
    const built = buildLinkedInSearchUrl({ ...criteria, postedWithinDays: 1 });
    expect(built.params.f_TPR).toBe('r86400');
  });

  it('builds a detail url', () => {
    expect(buildLinkedInDetailUrl('4437461678').url).toBe('https://www.linkedin.com/jobs/view/4437461678');
  });
});

describe('LinkedIn parsers (synthetic fixtures)', () => {
  it('parses guest cards without salary and strips tracking params', () => {
    const cards = parseLinkedInGuestCards(fixture('linkedin-guest-cards.html'), NOW);
    expect(cards).toHaveLength(2);
    expect(cards[0]).toEqual({
      source: 'linkedin',
      externalId: '4437461678',
      title: 'Product Designer',
      company: 'Exemple SA',
      companyLogoUrl: 'https://example.test/company-logo.png',
      location: { raw: 'Paris, Île-de-France, France', city: 'Paris' },
      workMode: null,
      contract: null,
      salary: null,
      postedAt: '2026-10-06T00:00:00.000Z',
      url: 'https://fr.linkedin.com/jobs/view/product-designer-at-exemple-4437461678',
      benefitBadge: 'Be an early applicant',
    });
    expect(cards[1]).toMatchObject({ externalId: '4437461999', postedAt: '2026-10-01T00:00:00.000Z', benefitBadge: null });
  });

  it('cleans tracking parameters', () => {
    expect(cleanLinkedInUrl('/jobs/view/1?trackingId=abc&refId=x&keep=1')).toBe('https://www.linkedin.com/jobs/view/1?keep=1');
    expect(cleanLinkedInUrl('')).toBeNull();
  });

  it('parses the detail page and criteria list', () => {
    const { job, extras } = parseLinkedInDetail(fixture('linkedin-detail.html'), '4437461678', NOW);
    expect(extras).toEqual({
      seniorityLevel: 'Mid-Senior level',
      employmentType: 'Full-time',
      jobFunction: 'Design',
      industries: 'Software Development',
      applicantCountText: 'Over 200 applicants',
    });
    expect(job).toMatchObject({
      externalId: '4437461678',
      title: 'Product Designer',
      company: 'Exemple SA',
      contract: 'permanent',
      experienceLevel: 'senior',
      sector: 'Software Development',
      postedAt: '2026-10-05T00:00:00.000Z',
      salary: null,
      companyUrl: 'https://fr.linkedin.com/company/exemple',
    });
    expect(job.description).toBe('Design the product.\nWork with engineers.');
  });
});

describe('LinkedIn connector', () => {
  it('stops at an authwall', async () => {
    const wall = createLinkedInConnector({ fetchText: async () => '<html><body class="authwall">Sign in</body></html>' });
    await expect(wall.search(criteria, 1)).rejects.toMatchObject({ code: 'blocked' });
    const ok = createLinkedInConnector({ now: () => NOW, fetchText: async () => fixture('linkedin-guest-cards.html') });
    expect(await ok.search(criteria, 1)).toHaveLength(2);
  });
});
