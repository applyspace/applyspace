import { describe, expect, it } from 'vitest';
import { searchCriteriaFromProfile, splitCriteria } from '../src/criteria.js';

describe('searchCriteriaFromProfile', () => {
  it('maps the saved search profile columns', () => {
    const criteria = searchCriteriaFromProfile({
      job_titles: ['Product Designer', ' Product Designer ', 'UX Designer'],
      locations: [{ label: 'Paris' }, { label: 'Niort', postal_code: '79000', country_code: 'fr' }, 'Lyon', { nope: 1 }],
      remote_modes: ['remote', 'hybrid', 'bogus'],
      contract_types: ['CDI', 'Alternance', 'Apprentissage', 'Stage', 'Bénévolat', 'Autre'],
      experience_levels: ['entry', 'senior', 'wizard'],
      salary_min: 45000,
      salary_currency: 'EUR',
    });
    expect(criteria).toEqual({
      jobTitles: ['Product Designer', 'UX Designer'],
      locations: [{ label: 'Paris' }, { label: 'Niort', postalCode: '79000', countryCode: 'FR' }, { label: 'Lyon' }],
      remoteModes: ['remote', 'hybrid'],
      contractTypes: ['permanent', 'apprenticeship', 'internship', 'volunteer'],
      experienceLevels: ['entry', 'senior'],
      salaryMin: 45000,
      salaryCurrency: 'EUR',
    });
  });

  it('handles an empty or partial row', () => {
    expect(searchCriteriaFromProfile({})).toEqual({
      jobTitles: [],
      locations: [],
      remoteModes: [],
      contractTypes: [],
      experienceLevels: [],
    });
    expect(searchCriteriaFromProfile({ salary_min: 0, locations: 'bad' }).salaryMin).toBeUndefined();
  });

  it('defaults the currency to EUR when only salary_min is set', () => {
    expect(searchCriteriaFromProfile({ salary_min: 30000, salary_currency: null }).salaryCurrency).toBe('EUR');
  });
});

describe('splitCriteria', () => {
  it('fans out titles x locations', () => {
    const base = searchCriteriaFromProfile({ job_titles: ['a', 'b'], locations: [{ label: 'X' }, { label: 'Y' }] });
    const parts = splitCriteria(base);
    expect(parts.map((p) => [p.jobTitles[0], p.locations[0]?.label])).toEqual([
      ['a', 'X'],
      ['a', 'Y'],
      ['b', 'X'],
      ['b', 'Y'],
    ]);
  });

  it('keeps a single query when there is no location', () => {
    expect(splitCriteria(searchCriteriaFromProfile({ job_titles: ['a'] }))).toHaveLength(1);
  });
});
