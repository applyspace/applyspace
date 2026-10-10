import { type ParsedResume, SENIORITY_ONBOARDING_LABEL } from './contract';

/**
 * What the onboarding "role" step starts with after a resume import (APP-120):
 * a job title already selected under the search bar and the matching seniority
 * card. The user can change both. Nothing is prefilled when the parser was not
 * sure (low confidence guesses are not shown as if they were facts).
 */
export interface OnboardingPrefill {
  jobTitle?: string;
  /** Label of the seniority card, as in the "role" step. */
  level?: string;
}

const MAX_TITLE = 80;

export function onboardingPrefill(resume: ParsedResume): OnboardingPrefill {
  const out: OnboardingPrefill = {};

  const latest = [...resume.experiences].sort((a, b) =>
    a.isCurrent === b.isCurrent ? (b.startDate ?? '').localeCompare(a.startDate ?? '') : a.isCurrent ? -1 : 1,
  )[0];
  const headline = resume.jobTitle && resume.jobTitle.confidence !== 'low' ? resume.jobTitle.value : undefined;
  // A headline can be a sentence ("Passionate about data | Open to work"): prefer the latest role then.
  const title = headline && headline.length <= MAX_TITLE && !/[|•]/.test(headline) ? headline : latest?.jobTitle;
  if (title && title.length <= MAX_TITLE) out.jobTitle = title;

  if (resume.seniority) out.level = SENIORITY_ONBOARDING_LABEL[resume.seniority.value];
  return out;
}
