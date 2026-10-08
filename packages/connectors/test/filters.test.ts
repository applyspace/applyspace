import { describe, expect, it } from 'vitest';
import { applyClientFilters } from '../src/filters.js';
import { parseWttjHits } from '../src/platforms/wttj/parse.js';
import { NOW, fixtureJson } from './helpers.js';

describe('applyClientFilters', () => {
  const jobs = parseWttjHits(fixtureJson('wttj-hits.json'), NOW);
  const base = { jobTitles: [], locations: [], remoteModes: [], contractTypes: [], experienceLevels: [] };

  it('filters by posted-within days', () => {
    expect(applyClientFilters(jobs, { ...base, postedWithinDays: 30 }, NOW)).toHaveLength(1);
    expect(applyClientFilters(jobs, { ...base, postedWithinDays: 0 }, NOW)).toHaveLength(2);
  });

  it('keeps jobs without salary, drops ones below the minimum', () => {
    expect(applyClientFilters(jobs, { ...base, salaryMin: 70000, salaryCurrency: 'EUR' }, NOW)).toHaveLength(2);
    expect(applyClientFilters(jobs, { ...base, salaryMin: 90000, salaryCurrency: 'EUR' }, NOW)).toHaveLength(1);
  });

  it('filters by contract type but keeps unknown contracts', () => {
    expect(applyClientFilters(jobs, { ...base, contractTypes: ['internship'] }, NOW).map((j) => j.externalId)).toEqual(['SYNTH_BBBB222']);
  });
});
