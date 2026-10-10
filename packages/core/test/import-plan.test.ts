import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateParsedResume } from '../src/resume/contract.ts';
import { planProfileImport, planSize, type ExistingProfile } from '../src/resume/import-plan.ts';
import { parseResumeWithRules } from '../src/resume/parse/rules.ts';
import { FIXTURES, NOW } from './fixtures.ts';

const EMPTY: ExistingProfile = { firstName: '', lastName: '', jobTitle: null, experiences: [], education: [], skills: [] };
const resume = parseResumeWithRules(FIXTURES[0].text, { now: NOW });

test('a first import creates everything that has a table', () => {
  const plan = planProfileImport(resume, EMPTY, { placeholderJobTitle: 'My profile' });
  assert.deepEqual(plan.account, { firstName: 'Jane', lastName: 'Doe' });
  assert.equal(plan.jobTitle, 'Senior Product Designer');
  assert.equal(plan.experiences.create.length, 2);
  assert.deepEqual(plan.experiences.create[0], {
    title: 'Senior Product Designer',
    companyName: 'Acme Corp',
    location: 'Paris',
    startedAt: '2021-01',
    endedAt: '',
    isCurrent: true,
    description: '- Led the redesign of the analytics dashboard\n- Mentored 3 junior designers'.replace(/- /g, ''),
  });
  assert.equal(plan.education.create.length, 1);
  assert.equal(plan.skills.create.length, 4);
  assert.deepEqual(plan.keptForLater, { languages: 2, certifications: 0, links: 1, summary: true, location: true });
  assert.ok(planSize(plan) > 8);
});

test('importing the same resume again adds nothing (idempotent)', () => {
  const first = planProfileImport(resume, EMPTY);
  const existing: ExistingProfile = {
    firstName: 'Jane',
    lastName: 'Doe',
    jobTitle: 'Senior Product Designer',
    experiences: first.experiences.create.map((e) => ({ title: e.title, companyName: e.companyName, startedAt: e.startedAt })),
    education: first.education.create.map((e) => ({ school: e.school, degree: e.degree, endedAt: e.endedAt })),
    skills: first.skills.create.map((s) => ({ name: s.name })),
  };
  const again = planProfileImport(resume, existing);
  assert.equal(planSize(again), 0);
  assert.equal(again.experiences.duplicates, 2);
  assert.equal(again.education.duplicates, 1);
  assert.equal(again.skills.duplicates, 4);
});

test('matching ignores case, accents and punctuation; existing data is never overwritten', () => {
  const plan = planProfileImport(
    resume,
    {
      firstName: 'Janet',
      lastName: '',
      jobTitle: 'Designer',
      experiences: [{ title: 'SENIOR product designer', companyName: 'acme corp.', startedAt: '2021-01' }],
      education: [],
      skills: [{ name: 'FIGMA' }],
    },
    { placeholderJobTitle: 'My profile' },
  );
  assert.deepEqual(plan.account, { lastName: 'Doe' });
  assert.equal(plan.jobTitle, undefined);
  assert.equal(plan.experiences.create.length, 1);
  assert.equal(plan.experiences.create[0].companyName, 'Beta Studio');
  assert.equal(plan.skills.create.length, 3);
});

test('the placeholder profile title is replaced', () => {
  const plan = planProfileImport(resume, { ...EMPTY, jobTitle: 'My profile' }, { placeholderJobTitle: 'My profile' });
  assert.equal(plan.jobTitle, 'Senior Product Designer');
});

test('entries the database would refuse are reported as incomplete, not sent', () => {
  const r = validateParsedResume(
    {
      experiences: [{ jobTitle: 'Dev' }, { companyName: 'X', startDate: '2020-01' }, { jobTitle: 'Dev', companyName: 'Y', startDate: '2020-01' }],
      education: [{ degree: 'MSc' }],
      skills: [{ name: 'Go' }, { name: 'go' }],
    },
    NOW,
  ).resume;
  const plan = planProfileImport(r, EMPTY);
  assert.equal(plan.experiences.incomplete, 2);
  assert.equal(plan.experiences.create.length, 1);
  assert.equal(plan.education.incomplete, 1);
  assert.equal(plan.skills.create.length, 1);
});
