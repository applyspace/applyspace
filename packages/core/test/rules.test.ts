import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateParsedResume } from '../src/resume/contract.ts';
import { scoreResume } from '../src/resume/parse/eval.ts';
import { findRange, parseResumeWithRules, splitRole } from '../src/resume/parse/rules.ts';
import { FIXTURES, NOW } from './fixtures.ts';

test('findRange reads periods in English and French', () => {
  assert.deepEqual(findRange('Jan 2021 - Present', NOW)?.isCurrent, true);
  const r = findRange("mars 2019 – Aujourd'hui", NOW);
  assert.equal(r?.startDate, '2019-03');
  assert.equal(r?.isCurrent, true);
  const closed = findRange('03/2018 - 06/2020', NOW);
  assert.equal(closed?.startDate, '2018-03');
  assert.equal(closed?.endDate, '2020-06');
  assert.equal(findRange('Depuis septembre 2022', NOW)?.isCurrent, true);
  for (const [text, month] of [['Feb 2020 - Mar 2021', '2020-02'], ['Février 2020 - 2021', '2020-02'], ['Sept. 2019 - Oct. 2020', '2019-09'], ['Aug 2018 - Dec 2019', '2018-08'], ['juil. 2017 - déc. 2018', '2017-07']]) {
    assert.equal(findRange(text, NOW)?.startDate, month, text);
  }
  assert.equal(findRange('Built 3 services in 2020', NOW), null);
  assert.equal(findRange('2020', NOW), null);
  assert.equal(findRange('2020', NOW, true)?.startDate, '2020-01');
});

test('splitRole handles dashes, "at", "chez", commas and swapped order', () => {
  assert.deepEqual(splitRole('Product Designer - Acme Corp - Paris'), { jobTitle: 'Product Designer', companyName: 'Acme Corp', location: 'Paris' });
  assert.deepEqual(splitRole('Designer at Acme'), { jobTitle: 'Designer', companyName: 'Acme', location: undefined });
  assert.deepEqual(splitRole('Technicien réseau chez Thales'), { jobTitle: 'Technicien réseau', companyName: 'Thales', location: undefined });
  assert.deepEqual(splitRole('Acme Corp | Software Engineer'), { jobTitle: 'Software Engineer', companyName: 'Acme Corp', location: undefined });
  assert.deepEqual(splitRole('Engineer, Acme, Berlin'), { jobTitle: 'Engineer', companyName: 'Acme', location: 'Berlin' });
});

for (const fixture of FIXTURES) {
  test(`eval set: ${fixture.id}`, () => {
    const actual = parseResumeWithRules(fixture.text, { now: NOW });
    const expected = validateParsedResume(fixture.expected, NOW).resume;
    const score = scoreResume(expected, actual);
    assert.ok(
      score.f1 >= 0.9 && score.recall >= 0.9,
      `f1=${score.f1.toFixed(2)} recall=${score.recall.toFixed(2)}\nmissing: ${score.missing.join('\n  ')}\nunexpected: ${score.unexpected.join('\n  ')}`,
    );
  });
}

test('eval set: overall F1 of the rules parser', () => {
  let f1 = 0;
  for (const fixture of FIXTURES) {
    const expected = validateParsedResume(fixture.expected, NOW).resume;
    f1 += scoreResume(expected, parseResumeWithRules(fixture.text, { now: NOW })).f1;
  }
  assert.ok(f1 / FIXTURES.length >= 0.93, `mean f1 ${(f1 / FIXTURES.length).toFixed(3)}`);
});

test('the parser never throws on odd text', () => {
  for (const text of ['', '   \n\n', 'just one line', '2020 - 2021', 'EXPERIENCE\n', '\u0000\u0001 weird �', 'a'.repeat(50_000)]) {
    const r = parseResumeWithRules(text, { now: NOW });
    assert.equal(r.version, 1);
  }
});

test('seniority and years are derived when the resume does not state them', () => {
  const r = parseResumeWithRules(
    ['Sam Lee', 'Backend Developer', 'sam@example.com', '', 'EXPERIENCE', 'Backend Developer - Foo Inc', 'Jan 2018 - Present'].join('\n'),
    { now: NOW },
  );
  assert.equal(r.yearsOfExperience?.value, 8);
  assert.equal(r.seniority?.value, 'senior');
});
