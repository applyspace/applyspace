import { describe, expect, it } from 'vitest';
import { createHelloWorkConnector } from '../src/platforms/hellowork/index.js';
import { parseHelloWorkDetail, parseHelloWorkListing } from '../src/platforms/hellowork/parse.js';
import {
  buildHelloWorkCanonicalUrl,
  buildHelloWorkDetailUrl,
  buildHelloWorkSearchUrl,
  slugify,
} from '../src/platforms/hellowork/urls.js';
import type { SearchCriteria } from '../src/types.js';
import { NOW, fixture } from './helpers.js';

const criteria: SearchCriteria = {
  jobTitles: ['product designer'],
  locations: [{ label: 'Paris' }],
  remoteModes: ['remote'],
  contractTypes: [],
  experienceLevels: [],
};

describe('HelloWork urls', () => {
  it('builds the verified dynamic search url', () => {
    const built = buildHelloWorkSearchUrl({ ...criteria, remoteModes: [] });
    expect(built.url).toBe('https://www.hellowork.com/fr-fr/emploi/recherche.html?k=product+designer&l=Paris');
    expect(built.unverified).toBe(false);
    expect(built.robotsDisallowed).toBe(true);
  });

  it('adds remote and flags the page parameter as unverified', () => {
    const built = buildHelloWorkSearchUrl(criteria, 2);
    expect(built.params).toEqual({ k: 'product designer', l: 'Paris', teletravail: 'ouvert', p: '2' });
    expect(built.unverifiedParams).toEqual(['p']);
  });

  it('builds canonical urls and requires a postal code', () => {
    expect(slugify('Développeur Full-Stack')).toBe('developpeur-full-stack');
    const built = buildHelloWorkCanonicalUrl({ jobSlug: 'développeur', city: 'Paris', postalCode: '75000', page: 2 });
    expect(built?.url).toBe('https://www.hellowork.com/fr-fr/emploi/metier_developpeur-ville_paris-75000.html?p=2');
    expect(buildHelloWorkCanonicalUrl({ jobSlug: 'développeur', city: 'Paris', postalCode: '' })).toBeNull();
    expect(buildHelloWorkDetailUrl('78174679')).toBe('https://www.hellowork.com/fr-fr/emplois/78174679.html');
  });
});

describe('HelloWork parsers (synthetic fixtures)', () => {
  it('parses listing cards, dedupes ids and reads the total count', () => {
    const { jobs, totalCount } = parseHelloWorkListing(fixture('hellowork-listing.html'), NOW);
    expect(totalCount).toBe(312);
    expect(jobs.map((j) => j.externalId)).toEqual(['78174679', '78174680']);
    expect(jobs[0]).toEqual({
      source: 'hellowork',
      externalId: '78174679',
      title: 'Product Designer H/F',
      company: 'Studio Exemple',
      companyLogoUrl: 'https://www.hellowork.com/logos/studio.png',
      location: { raw: 'Paris - 75', city: 'Paris' },
      workMode: 'hybrid',
      contract: 'permanent',
      salary: { min: 45000, max: 55000, currency: 'EUR', period: 'year', yearlyMin: 45000 },
      postedAt: '2026-10-05T00:00:00.000Z',
      url: 'https://www.hellowork.com/fr-fr/emplois/78174679.html',
    });
    expect(jobs[1]).toMatchObject({ contract: 'internship', workMode: null, salary: null, postedAt: '2026-10-06T07:00:00.000Z' });
  });

  it('parses a detail page from JSON-LD', () => {
    const url = 'https://www.hellowork.com/fr-fr/emplois/78174679.html';
    const job = parseHelloWorkDetail(fixture('hellowork-detail.html'), url, NOW);
    expect(job).toMatchObject({
      externalId: '78174679',
      title: 'Développeur full-stack',
      company: 'Entreprise Démo',
      contract: 'fixed_term',
      workMode: 'remote',
      salary: { min: 70000, max: 90000, currency: 'EUR', period: 'year' },
      postedAt: '2026-10-02T00:00:00.000Z',
      validThrough: '2026-12-01T23:00:00.000Z',
      experienceLevel: 'senior',
      educationLevel: 'bac+5',
      skills: ['TypeScript', 'PostgreSQL'],
      location: { city: 'Niort', postalCode: '79000', countryCode: 'FR' },
    });
    expect(job.description).toBe('Missions :\n- Développer des API\n- Revue de code');
  });
});

describe('HelloWork connector', () => {
  it('fetches, parses and stops on a block page', async () => {
    const calls: string[] = [];
    const ok = createHelloWorkConnector({
      now: () => NOW,
      fetchText: async (url) => {
        calls.push(url);
        return url.includes('recherche') ? fixture('hellowork-listing.html') : fixture('hellowork-detail.html');
      },
    });
    expect(await ok.search(criteria, 1)).toHaveLength(2);
    expect((await ok.detail('78174679')).title).toBe('Développeur full-stack');
    expect(calls[1]).toBe('https://www.hellowork.com/fr-fr/emplois/78174679.html');

    const blocked = createHelloWorkConnector({
      fetchText: async () => '<html><title>Just a moment...</title><div class="cf-challenge"></div></html>',
    });
    await expect(blocked.search(criteria, 1)).rejects.toMatchObject({ code: 'blocked' });
  });
});
