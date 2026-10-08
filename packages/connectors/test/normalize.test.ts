import { describe, expect, it } from 'vitest';
import {
  annualize,
  experienceFromMonths,
  locationFromText,
  normalizeContract,
  normalizeDate,
  normalizeRemote,
  normalizeSalaryPeriod,
  normalizeSeniority,
  parseSalaryText,
} from '../src/normalize.js';
import { NOW } from './helpers.js';

describe('normalizeContract', () => {
  it.each([
    ['CDI', 'permanent'],
    ['FULL_TIME', 'permanent'],
    ['Permanent', 'permanent'],
    ['CDD', 'fixed_term'],
    ['FIXED_TERM', 'fixed_term'],
    ['Stage', 'internship'],
    ['INTERN', 'internship'],
    ['Alternance', 'apprenticeship'],
    ['Contrat d’apprentissage', 'apprenticeship'],
    ['Freelance', 'freelance'],
    ['CONTRACTOR', 'freelance'],
    ['Temps partiel', 'part_time'],
    ['PART_TIME', 'part_time'],
    ['Intérim', 'temporary'],
    ['VOLUNTEER', 'volunteer'],
    ['Contract', 'other'],
  ])('%s -> %s', (raw, expected) => {
    expect(normalizeContract(raw)).toBe(expected);
  });

  it('takes the first known value of a list and returns null for junk', () => {
    expect(normalizeContract(['', 'CDD'])).toBe('fixed_term');
    expect(normalizeContract('???')).toBeNull();
    expect(normalizeContract(undefined)).toBeNull();
  });
});

describe('normalizeRemote', () => {
  it.each([
    ['fulltime', 'remote'],
    ['partial', 'hybrid'],
    ['TELECOMMUTE', 'remote'],
    ['Télétravail complet', 'remote'],
    ['Télétravail partiel', 'hybrid'],
    ['Hybride', 'hybrid'],
    ['no', 'onsite'],
    ['Sur site', 'onsite'],
  ])('%s -> %s', (raw, expected) => {
    expect(normalizeRemote(raw)).toBe(expected);
  });

  it('keeps unknown as null', () => {
    expect(normalizeRemote(null)).toBeNull();
    expect(normalizeRemote('')).toBeNull();
    expect(normalizeRemote(false)).toBeNull();
    expect(normalizeRemote(true)).toBe('remote');
  });
});

describe('salary', () => {
  it('parses period aliases in French and English', () => {
    expect(normalizeSalaryPeriod('YEAR')).toBe('year');
    expect(normalizeSalaryPeriod('par an')).toBe('year');
    expect(normalizeSalaryPeriod('MONTH')).toBe('month');
    expect(normalizeSalaryPeriod('de l’heure')).toBe('hour');
    expect(normalizeSalaryPeriod('par jour')).toBe('day');
    expect(normalizeSalaryPeriod('weekly')).toBe('week');
    expect(normalizeSalaryPeriod('')).toBeNull();
  });

  it('parses the report example', () => {
    expect(parseSalaryText('45 000 € - 60 000 € par an')).toEqual({
      min: 45000,
      max: 60000,
      currency: 'EUR',
      period: 'year',
      yearlyMin: 45000,
    });
  });

  it('parses single amounts, other currencies and hourly pay', () => {
    expect(parseSalaryText('À partir de 15 € de l’heure')).toMatchObject({ min: 15, max: null, period: 'hour' });
    expect(parseSalaryText('$80,000 - $100,000 a year')).toMatchObject({ min: 80000, max: 100000, currency: 'USD', period: 'year' });
    expect(parseSalaryText('3 200,50 € par mois')).toMatchObject({ min: 3200.5, period: 'month', yearlyMin: 38406 });
    expect(parseSalaryText('45k € par an')).toMatchObject({ min: 45000 });
  });

  it('returns null without an amount or currency', () => {
    expect(parseSalaryText('Aucun salaire indiqué')).toBeNull();
    expect(parseSalaryText('CDI')).toBeNull();
    expect(parseSalaryText(undefined)).toBeNull();
  });

  it('annualizes with documented factors', () => {
    expect(annualize(3000, 'month')).toBe(36000);
    expect(annualize(200, 'day')).toBe(43600);
    expect(annualize(1000, null)).toBeNull();
  });
});

describe('normalizeDate', () => {
  it('normalizes ISO strings with offsets to UTC', () => {
    expect(normalizeDate('2026-07-10T15:00:00.000+02:00')).toBe('2026-07-10T13:00:00.000Z');
    expect(normalizeDate('2026-10-02')).toBe('2026-10-02T00:00:00.000Z');
  });

  it('resolves relative French and English phrases to the day', () => {
    expect(normalizeDate('il y a 3 jours', NOW)).toBe('2026-10-05T00:00:00.000Z');
    expect(normalizeDate('Publiée il y a 5 jours', NOW)).toBe('2026-10-03T00:00:00.000Z');
    expect(normalizeDate('2 weeks ago', NOW)).toBe('2026-09-24T00:00:00.000Z');
    expect(normalizeDate('il y a 2 heures', NOW)).toBe('2026-10-08T10:00:00.000Z');
    expect(normalizeDate("Aujourd'hui", NOW)).toBe('2026-10-08T00:00:00.000Z');
    expect(normalizeDate('Hier', NOW)).toBe('2026-10-07T00:00:00.000Z');
    expect(normalizeDate('1 month ago', NOW)).toBe('2026-09-08T00:00:00.000Z');
  });

  it('returns null for junk', () => {
    expect(normalizeDate('', NOW)).toBeNull();
    expect(normalizeDate('soon', NOW)).toBeNull();
    expect(normalizeDate(undefined, NOW)).toBeNull();
  });
});

describe('experience and location', () => {
  it('maps months to levels', () => {
    expect([0, 23, 24, 59, 60, 119, 120].map(experienceFromMonths)).toEqual(['entry', 'entry', 'mid', 'mid', 'senior', 'senior', 'lead']);
  });

  it('maps LinkedIn seniority labels', () => {
    expect(normalizeSeniority('Internship')).toBe('entry');
    expect(normalizeSeniority('Entry level')).toBe('entry');
    expect(normalizeSeniority('Associate')).toBe('mid');
    expect(normalizeSeniority('Mid-Senior level')).toBe('senior');
    expect(normalizeSeniority('Director')).toBe('lead');
    expect(normalizeSeniority('Not Applicable')).toBeNull();
  });

  it('extracts city and postal code from free text', () => {
    expect(locationFromText('Paris - 75')).toEqual({ raw: 'Paris - 75', city: 'Paris' });
    expect(locationFromText('Niort 79000')).toMatchObject({ city: 'Niort', postalCode: '79000' });
    expect(locationFromText('Lyon, Auvergne-Rhône-Alpes, France')).toMatchObject({ city: 'Lyon' });
    expect(locationFromText('')).toBeNull();
  });
});
