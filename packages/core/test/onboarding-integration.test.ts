import assert from 'node:assert/strict';
import { test } from 'node:test';
import { extractResumeText } from '../src/resume/extract/index.ts';
import { planProfileImport, type ExistingProfile } from '../src/resume/import-plan.ts';
import { onboardingPrefill } from '../src/resume/onboarding-prefill.ts';
import { parseResume } from '../src/resume/parse/llm.ts';
import { buildPdf, type PdfLine } from './helpers.ts';
import { NOW } from './fixtures.ts';

/**
 * APP-120: the onboarding import, end to end on a synthetic resume. The web app
 * runs these same steps (upload -> text -> parse -> prefill the role step ->
 * review -> save); only the Supabase calls and the UI are outside this test.
 */

const lines = (texts: string[], top = 780): PdfLine[] => texts.map((text, i) => ({ x: 50, y: top - i * 16, text, size: 11 }));

const RESUME = [
  'Sofia Rossi',
  'Lead Backend Engineer',
  'sofia.rossi@example.com | +39 333 123 4567 | Milan, Italy',
  '',
  'EXPERIENCE',
  'Lead Backend Engineer - Nimbus Cloud - Milan',
  'Mar 2019 - Present',
  'Runs the payments platform team.',
  '',
  'Backend Engineer - Verde Software - Turin',
  'Sep 2013 - Feb 2019',
  '',
  'EDUCATION',
  'MSc Computer Engineering, Politecnico di Torino, 2011 - 2013',
  '',
  'SKILLS',
  'Go, PostgreSQL, Kubernetes',
];

test('onboarding import: file -> prefilled role step -> rows that would be saved', async () => {
  const extracted = await extractResumeText(buildPdf([lines(RESUME)]));
  assert.ok(extracted.ok);
  const { resume } = await parseResume(extracted.text, { now: NOW });

  // Role step: the job title is selected under the search bar and the seniority card is preselected.
  assert.deepEqual(onboardingPrefill(resume), { jobTitle: 'Lead Backend Engineer', level: 'Lead or above' });

  // What the review confirms and the end of onboarding saves, for a brand new account.
  const empty: ExistingProfile = { firstName: '', lastName: '', jobTitle: 'My profile', experiences: [], education: [], skills: [] };
  const plan = planProfileImport(resume, empty, { placeholderJobTitle: 'My profile' });
  assert.deepEqual(plan.account, { firstName: 'Sofia', lastName: 'Rossi' });
  assert.equal(plan.jobTitle, 'Lead Backend Engineer');
  assert.deepEqual(
    plan.experiences.create.map((e) => [e.companyName, e.title, e.startedAt, e.endedAt, e.isCurrent]),
    [
      ['Nimbus Cloud', 'Lead Backend Engineer', '2019-03', '', true],
      ['Verde Software', 'Backend Engineer', '2013-09', '2019-02', false],
    ],
  );
  assert.equal(plan.education.create[0]?.school, 'Politecnico di Torino');
  assert.deepEqual(plan.skills.create.map((s) => s.name), ['Go', 'PostgreSQL', 'Kubernetes']);

  // The user finishes onboarding twice (or imports again from Profile): nothing is duplicated.
  const saved: ExistingProfile = {
    firstName: 'Sofia',
    lastName: 'Rossi',
    jobTitle: 'Lead Backend Engineer',
    experiences: plan.experiences.create.map((e) => ({ title: e.title, companyName: e.companyName, startedAt: e.startedAt })),
    education: plan.education.create.map((e) => ({ school: e.school, degree: e.degree, endedAt: e.endedAt })),
    skills: plan.skills.create.map((s) => ({ name: s.name })),
  };
  const again = planProfileImport(resume, saved, { placeholderJobTitle: 'My profile' });
  assert.equal(again.experiences.create.length + again.education.create.length + again.skills.create.length, 0);
});

test('onboarding import: a resume the parser cannot place prefills nothing instead of guessing', async () => {
  const extracted = await extractResumeText(buildPdf([lines(['Meeting notes', 'buy milk', 'call back tomorrow', '', 'see you on 2020'])]));
  assert.ok(extracted.ok);
  const { resume } = await parseResume(extracted.text, { now: NOW });
  assert.deepEqual(onboardingPrefill(resume), {});
});
