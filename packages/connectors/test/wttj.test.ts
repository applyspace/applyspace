import { describe, expect, it } from 'vitest';
import { createWttjConnector } from '../src/platforms/wttj/index.js';
import { parseWttjHits, parseWttjJobPage } from '../src/platforms/wttj/parse.js';
import { buildWttjSearchRequest, buildWttjWebSearchUrl } from '../src/platforms/wttj/urls.js';
import type { SearchCriteria } from '../src/types.js';
import { NOW, fixture, fixtureJson } from './helpers.js';

const criteria: SearchCriteria = {
  jobTitles: ['product designer'],
  locations: [{ label: 'Paris', countryCode: 'FR' }],
  remoteModes: ['remote', 'hybrid'],
  contractTypes: ['permanent', 'internship'],
  experienceLevels: [],
  postedWithinDays: 7,
};

describe('WTTJ urls', () => {
  it('builds the documented search request and flags it unverified', () => {
    expect(buildWttjSearchRequest(criteria, 2)).toEqual({
      queries: ['product designer'],
      countryCodes: ['FR'],
      cities: ['Paris'],
      contractTypes: ['permanent', 'internship'],
      remotePolicies: ['fulltime', 'partial'],
      languages: [],
      searchTitleOnly: false,
      postedWithinDays: 7,
      page: 2,
      unverified: true,
    });
  });

  it('builds the web url, marked unverified and robots-disallowed', () => {
    const built = buildWttjWebSearchUrl(criteria, 3);
    expect(built.url).toContain('https://www.welcometothejungle.com/fr/jobs?');
    expect(built.params.query).toBe('product designer');
    expect(built.params.page).toBe('3');
    expect(built.unverified).toBe(true);
    expect(built.unverifiedParams).toContain('query');
    expect(built.robotsDisallowed).toBe(true);
  });
});

describe('WTTJ parsers (synthetic fixtures)', () => {
  it('parses index hits and drops entries without a reference', () => {
    const jobs = parseWttjHits(fixtureJson('wttj-hits.json'), NOW);
    expect(jobs).toHaveLength(2);
    expect(jobs[0]).toEqual({
      source: 'wttj',
      externalId: 'SYNTH_AAAA111',
      title: 'Lead Developer (Python/React) - CDI - Paris',
      company: 'Exemple SAS',
      companyLogoUrl: 'https://example.test/logo-a.png',
      location: { city: 'Paris', countryCode: 'FR', latitude: 48.8566, longitude: 2.3522 },
      workMode: 'hybrid',
      contract: 'permanent',
      salary: { min: 65000, max: 80000, currency: 'EUR', period: 'year', yearlyMin: 65000 },
      postedAt: '2026-07-10T13:00:00.000Z',
      url: 'https://www.welcometothejungle.com/fr/companies/exemple-sas/jobs/lead-developer-python-react_paris',
    });
    expect(jobs[1]).toMatchObject({ workMode: 'remote', contract: 'internship', salary: null });
  });

  it('accepts bare arrays and multi-query results', () => {
    const hit = { reference: 'X', title: 'T' };
    expect(parseWttjHits([hit])).toHaveLength(1);
    expect(parseWttjHits({ results: [{ hits: [hit] }, { hits: [hit] }] })).toHaveLength(2);
    expect(parseWttjHits(null)).toEqual([]);
  });

  it('parses a job page from JSON-LD', () => {
    const job = parseWttjJobPage(fixture('wttj-job-page.html'), 'https://www.welcometothejungle.com/fr/companies/x/jobs/y', NOW);
    expect(job).toMatchObject({
      externalId: 'SYNTH_CCCC333',
      title: 'Data Analyst',
      company: 'Exemple SAS',
      contract: 'permanent',
      postedAt: '2026-09-28T07:00:00.000Z',
      validThrough: '2026-11-30T00:00:00.000Z',
      experienceLevel: 'mid',
      sector: 'Software',
      skills: ['SQL', 'Python'],
      location: { city: 'Niort', postalCode: '79000', region: 'Nouvelle-Aquitaine', countryCode: 'FR' },
      salary: { min: 38000, max: 45000, currency: 'EUR', period: 'year' },
    });
    expect(job.description).toBe('Analyse product data.\nSQL\nPython');
  });

  it('throws a parse error without JSON-LD', () => {
    expect(() => parseWttjJobPage('<html></html>', 'https://x.test/a')).toThrow(/JobPosting/);
  });
});

describe('WTTJ connector', () => {
  it('searches through the injected index and resolves detail from remembered urls', async () => {
    const requests: unknown[] = [];
    const fetched: string[] = [];
    const connector = createWttjConnector({
      now: () => NOW,
      searchIndex: async (req) => {
        requests.push(req);
        return fixtureJson('wttj-hits.json');
      },
      fetchText: async (url) => {
        fetched.push(url);
        return fixture('wttj-job-page.html');
      },
    });
    const jobs = await connector.search(criteria, 1);
    expect(jobs).toHaveLength(2);
    expect(requests).toHaveLength(1);
    const job = await connector.detail('SYNTH_BBBB222');
    expect(fetched[0]).toBe('https://www.welcometothejungle.com/fr/companies/demo-studio/jobs/product-designer_lyon');
    expect(job.title).toBe('Data Analyst');
    await expect(connector.detail('NOPE')).rejects.toMatchObject({ code: 'unknown_id' });
  });
});
