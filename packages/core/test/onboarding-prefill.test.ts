import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateParsedResume } from '../src/resume/contract.ts';
import { onboardingPrefill } from '../src/resume/onboarding-prefill.ts';
import { parseResumeWithRules } from '../src/resume/parse/rules.ts';
import { FIXTURES, NOW } from './fixtures.ts';

const resume = parseResumeWithRules(FIXTURES[0].text, { now: NOW });

test('onboarding prefill: job title and seniority card from a resume', () => {
  assert.deepEqual(onboardingPrefill(resume), { jobTitle: 'Senior Product Designer', level: 'Senior' });
  const junior = parseResumeWithRules(FIXTURES[4].text, { now: NOW });
  assert.equal(onboardingPrefill(junior).level, 'Entry level');
  const lead = parseResumeWithRules(FIXTURES[2].text, { now: NOW });
  assert.deepEqual(onboardingPrefill(lead), { jobTitle: 'Staff Software Engineer', level: 'Lead or above' });
});

test('onboarding prefill: a sentence-like headline falls back to the latest role; empty resume gives nothing', () => {
  const r = validateParsedResume(
    {
      jobTitle: 'Passionate about data | Open to work',
      experiences: [{ jobTitle: 'Data Analyst', companyName: 'Z', startDate: '2022-01', isCurrent: true }],
    },
    NOW,
  ).resume;
  assert.equal(onboardingPrefill(r).jobTitle, 'Data Analyst');
  assert.deepEqual(onboardingPrefill(validateParsedResume({}, NOW).resume), {});
});
