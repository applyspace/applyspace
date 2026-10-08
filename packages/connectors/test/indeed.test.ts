import { describe, expect, it } from 'vitest';
import { createIndeedConnector } from '../src/platforms/indeed/index.js';
import { parseIndeedDetail, parseIndeedRecord, parseIndeedResults } from '../src/platforms/indeed/parse.js';
import { buildIndeedDetailUrl, buildIndeedSearchUrl, fromageFor } from '../src/platforms/indeed/urls.js';
import type { SearchCriteria } from '../src/types.js';
import { NOW, fixture, fixtureJson } from './helpers.js';

const criteria: SearchCriteria = {
  jobTitles: ['data analyst'],
  locations: [{ label: 'Niort' }],
  remoteModes: [],
  contractTypes: [],
  experienceLevels: [],
  radiusKm: 25,
  sort: 'date',
  postedWithinDays: 5,
};

describe('Indeed urls', () => {
  it('builds the verified parameters', () => {
    const built = buildIndeedSearchUrl(criteria);
    expect(built.url).toBe('https://fr.indeed.com/jobs?q=data+analyst&l=Niort&radius=25&sort=date&fromage=7');
    expect(built.unverified).toBe(false);
    expect(built.robotsDisallowed).toBe(false);
  });

  it('flags start and passthrough filters as unverified', () => {
    const built = buildIndeedSearchUrl(criteria, 3, { extra: { jt: 'fulltime' } });
    expect(built.params.start).toBe('20');
    expect(built.unverifiedParams).toEqual(['start', 'jt']);
  });

  it('snaps fromage to 1, 3, 7, 14', () => {
    expect([1, 2, 4, 8, 14, 30, 0].map(fromageFor)).toEqual([1, 3, 7, 14, 14, null, null]);
    expect(buildIndeedSearchUrl({ ...criteria, postedWithinDays: 30 }).notes.join()).toContain('client-side');
  });

  it('flags viewjob as robots-disallowed', () => {
    const built = buildIndeedDetailUrl('2aa489becfc76419');
    expect(built.url).toBe('https://fr.indeed.com/viewjob?jk=2aa489becfc76419');
    expect(built.robotsDisallowed).toBe(true);
  });
});

describe('Indeed parsers (synthetic fixtures)', () => {
  it('parses result cards', () => {
    const jobs = parseIndeedResults(fixture('indeed-results.html'), 'fr.indeed.com', NOW);
    expect(jobs).toHaveLength(2);
    expect(jobs[0]).toEqual({
      source: 'indeed',
      externalId: '2aa489becfc76419',
      title: 'Data Analyst',
      company: 'Société Exemple',
      companyLogoUrl: null,
      location: { raw: 'Niort (79)', city: 'Niort' },
      workMode: null,
      contract: 'permanent',
      salary: { min: 45000, max: 60000, currency: 'EUR', period: 'year', yearlyMin: 45000 },
      postedAt: '2026-10-03T00:00:00.000Z',
      url: 'https://fr.indeed.com/viewjob?jk=2aa489becfc76419',
    });
    expect(jobs[1]).toMatchObject({ workMode: 'remote', contract: 'internship', postedAt: '2026-10-08T00:00:00.000Z' });
  });

  it('parses the detail page fields', () => {
    const job = parseIndeedDetail(fixture('indeed-detail.html'), '2aa489becfc76419', 'fr.indeed.com', NOW);
    expect(job).toMatchObject({
      title: 'Data Analyst',
      company: 'Société Exemple',
      contract: 'permanent',
      salary: { min: 45000, max: 60000, period: 'year' },
    });
    expect(job.description).toBe('Vous analysez les données.\nSQL');
  });

  it('parses the documented structured record', () => {
    const job = parseIndeedRecord(fixtureJson('indeed-record.json') as Record<string, unknown>, NOW);
    expect(job).toMatchObject({
      externalId: '2aa489becfc76419',
      workMode: null,
      salary: { min: 45000, max: 60000, currency: 'EUR', period: 'year', isEstimated: false },
      location: { city: 'Niort', postalCode: '79000', countryCode: 'FR', region: 'NAQ' },
      postedAt: '2026-10-03T00:00:00.000Z',
      skills: ['SQL', 'Python'],
      sector: 'Services',
    });
    expect(parseIndeedRecord({ title: 'no key' })).toBeNull();
  });

  it('maps salary types other than year', () => {
    const job = parseIndeedRecord({ jobKey: 'k', title: 'T', salary: { salaryMin: 2500, salaryMax: 3000, salaryType: 'MONTH', salaryCurrency: 'EUR' } });
    expect(job?.salary).toMatchObject({ period: 'month', yearlyMin: 30000 });
  });
});

describe('Indeed connector', () => {
  it('stops when a verification page is returned', async () => {
    const blocked = createIndeedConnector({ fetchText: async () => '<html><title>Additional Verification Required</title></html>' });
    await expect(blocked.search(criteria, 1)).rejects.toMatchObject({ code: 'blocked', platform: 'indeed' });
    const ok = createIndeedConnector({ now: () => NOW, fetchText: async () => fixture('indeed-results.html') });
    expect(await ok.search(criteria, 1)).toHaveLength(2);
  });
});
