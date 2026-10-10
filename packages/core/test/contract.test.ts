import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  inferSeniority,
  isPresentMarker,
  normalizeEmail,
  normalizeMonth,
  normalizePhone,
  normalizeUrl,
  validateParsedResume,
  yearsOfExperienceFrom,
} from '../src/resume/contract.ts';

const NOW = new Date('2026-10-10T00:00:00Z');

test('normalizeMonth reads the date styles of resumes in English and French', () => {
  assert.equal(normalizeMonth('2021-03', NOW), '2021-03');
  assert.equal(normalizeMonth('2021-03-15', NOW), '2021-03');
  assert.equal(normalizeMonth('03/2021', NOW), '2021-03');
  assert.equal(normalizeMonth('Mar 2021', NOW), '2021-03');
  assert.equal(normalizeMonth('mars 2021', NOW), '2021-03');
  assert.equal(normalizeMonth('Février 2019', NOW), '2019-02');
  assert.equal(normalizeMonth('Aug. 2020', NOW), '2020-08');
  assert.equal(normalizeMonth('2018', NOW), '2018-01');
});

test('normalizeMonth rejects what is not a date', () => {
  assert.equal(normalizeMonth('13/2021', NOW), undefined);
  assert.equal(normalizeMonth('1800', NOW), undefined);
  assert.equal(normalizeMonth('2099-01', NOW), undefined);
  assert.equal(normalizeMonth('Present', NOW), undefined);
  assert.equal(normalizeMonth(42, NOW), undefined);
});

test('isPresentMarker', () => {
  for (const v of ['Present', 'current', "Aujourd'hui", 'aujourd’hui', 'En cours', 'ce jour']) assert.ok(isPresentMarker(v), v);
  assert.ok(!isPresentMarker('2021'));
});

test('contact normalisers', () => {
  assert.equal(normalizeEmail(' Jane.Doe@Example.COM '), 'jane.doe@example.com');
  assert.equal(normalizeEmail('not an email'), undefined);
  assert.equal(normalizePhone('+33 6 12 34 56 78'), '+33 6 12 34 56 78');
  assert.equal(normalizePhone('12'), undefined);
  assert.equal(normalizeUrl('github.com/jane'), 'https://github.com/jane');
  assert.equal(normalizeUrl('https://example.com/'), 'https://example.com');
  assert.equal(normalizeUrl('hello'), undefined);
});

test('validateParsedResume cleans untrusted output and never throws', () => {
  const { resume, issues } = validateParsedResume(
    {
      firstName: { value: ' Jane ', confidence: 'high' },
      lastName: 'Doe',
      email: { value: 'bad', confidence: 'high' },
      seniority: { value: 'Senior', confidence: 'low' },
      yearsOfExperience: 8,
      unknownKey: 'ignored',
      experiences: [
        { companyName: 'Acme', jobTitle: 'Engineer', startDate: 'Jan 2019', endDate: 'Present' },
        { companyName: 'Beta', startDate: '2015', endDate: '2012' },
        { description: 'orphan' },
        'garbage',
      ],
      skills: [{ name: 'TypeScript', level: 'expert' }, { name: 'typescript' }, { name: 'Go', level: 'godlike' }],
      links: [{ url: 'linkedin.com/in/jane' }, { url: 'linkedin.com/in/jane' }, { url: 'nope' }],
    },
    NOW,
  );
  assert.deepEqual(resume.firstName, { value: 'Jane', confidence: 'high' });
  assert.deepEqual(resume.lastName, { value: 'Doe', confidence: 'medium' });
  assert.equal(resume.email, undefined);
  assert.deepEqual(resume.seniority, { value: 'senior', confidence: 'low' });
  assert.equal(resume.yearsOfExperience?.value, 8);
  assert.equal('unknownKey' in resume, false);
  assert.equal(resume.experiences.length, 2);
  assert.deepEqual(resume.experiences[0], {
    companyName: 'Acme',
    jobTitle: 'Engineer',
    startDate: '2019-01',
    isCurrent: true,
    confidence: 'medium',
  });
  // End before start is dropped, the start is kept.
  assert.equal(resume.experiences[1].startDate, '2015-01');
  assert.equal(resume.experiences[1].endDate, undefined);
  assert.deepEqual(resume.skills.map((s) => [s.name, s.level]), [['TypeScript', 'expert'], ['Go', undefined]]);
  assert.deepEqual(resume.links, [{ url: 'https://linkedin.com/in/jane', kind: 'linkedin', confidence: 'medium' }]);
  assert.ok(issues.some((i) => i.includes('experience')));
});

test('validateParsedResume accepts garbage input', () => {
  for (const bad of [null, undefined, 42, 'text', []]) {
    const { resume, issues } = validateParsedResume(bad, NOW);
    assert.equal(resume.experiences.length, 0);
    assert.ok(issues.length >= 0);
  }
});

test('years of experience and seniority', () => {
  assert.equal(yearsOfExperienceFrom([{ startDate: '2016-10', confidence: 'high' }], NOW), 10);
  assert.equal(yearsOfExperienceFrom([], NOW), undefined);
  assert.equal(inferSeniority('Senior Product Designer', 2)?.value, 'senior');
  assert.equal(inferSeniority('Stagiaire marketing', 9)?.value, 'entry');
  assert.equal(inferSeniority('Engineering Manager', undefined)?.value, 'lead');
  assert.equal(inferSeniority('Developer', 4)?.value, 'mid');
  assert.equal(inferSeniority('Developer', undefined), undefined);
});
