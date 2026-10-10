import type { EducationInput, ExperienceInput, SkillInput } from '../candidate-profile';
import { type ParsedResume, ascii } from './contract';

/**
 * What saving a reviewed {@link ParsedResume} would change (APP-110). Pure: the
 * server action loads the existing profile, calls {@link planProfileImport}, then
 * writes only `create` lists. Re-importing the same resume therefore adds nothing
 * (merge keys below), and nothing is ever overwritten or deleted: names and the
 * job title are only filled when empty.
 *
 * Only data with a table today is written (name, default profile title,
 * experiences, education, skills). Languages, certifications, links, the summary
 * and the location are reported in `keptForLater` until the APP-119 migration is
 * applied and wired.
 */

export interface ExistingProfile {
  firstName: string;
  lastName: string;
  /** Title of the default profile; empty or the placeholder counts as unset. */
  jobTitle: string | null;
  experiences: { title: string; companyName: string; startedAt: string }[];
  education: { school: string; degree: string; endedAt: string }[];
  skills: { name: string }[];
}

export interface ImportPlan {
  account: { firstName?: string; lastName?: string };
  jobTitle?: string;
  experiences: { create: ExperienceInput[]; duplicates: number; incomplete: number };
  education: { create: EducationInput[]; duplicates: number; incomplete: number };
  skills: { create: SkillInput[]; duplicates: number };
  keptForLater: { languages: number; certifications: number; links: number; summary: boolean; location: boolean };
}

const norm = (value: string | undefined | null) => ascii(value ?? '').replace(/[^a-z0-9]+/g, ' ').trim();

export function planProfileImport(
  resume: ParsedResume,
  existing: ExistingProfile,
  options: { placeholderJobTitle?: string } = {},
): ImportPlan {
  const plan: ImportPlan = {
    account: {},
    experiences: { create: [], duplicates: 0, incomplete: 0 },
    education: { create: [], duplicates: 0, incomplete: 0 },
    skills: { create: [], duplicates: 0 },
    keptForLater: {
      languages: resume.languages.length,
      certifications: resume.certifications.length,
      links: resume.links.length,
      summary: !!resume.description,
      location: !!resume.location,
    },
  };

  if (!existing.firstName.trim() && resume.firstName) plan.account.firstName = resume.firstName.value;
  if (!existing.lastName.trim() && resume.lastName) plan.account.lastName = resume.lastName.value;

  const currentTitle = (existing.jobTitle ?? '').trim();
  const unsetTitle = !currentTitle || (!!options.placeholderJobTitle && currentTitle === options.placeholderJobTitle);
  if (unsetTitle && resume.jobTitle) plan.jobTitle = resume.jobTitle.value;

  const seenExperience = new Set(existing.experiences.map((e) => `${norm(e.companyName)}|${norm(e.title)}|${e.startedAt}`));
  for (const e of resume.experiences) {
    if (!e.jobTitle || !e.startDate) {
      plan.experiences.incomplete++;
      continue;
    }
    const key = `${norm(e.companyName)}|${norm(e.jobTitle)}|${e.startDate}`;
    if (seenExperience.has(key)) {
      plan.experiences.duplicates++;
      continue;
    }
    seenExperience.add(key);
    plan.experiences.create.push({
      title: e.jobTitle,
      companyName: e.companyName ?? '',
      location: e.location ?? '',
      startedAt: e.startDate,
      endedAt: e.isCurrent ? '' : (e.endDate ?? ''),
      isCurrent: e.isCurrent === true,
      description: e.description ?? '',
    });
  }

  const seenEducation = new Set(existing.education.map((e) => `${norm(e.school)}|${norm(e.degree)}|${e.endedAt}`));
  for (const e of resume.education) {
    if (!e.school) {
      plan.education.incomplete++;
      continue;
    }
    const key = `${norm(e.school)}|${norm(e.degree)}|${e.endDate ?? ''}`;
    if (seenEducation.has(key)) {
      plan.education.duplicates++;
      continue;
    }
    seenEducation.add(key);
    plan.education.create.push({
      school: e.school,
      degree: e.degree ?? '',
      field: e.field ?? '',
      startedAt: e.startDate ?? '',
      endedAt: e.endDate ?? '',
      description: e.description ?? '',
    });
  }

  const seenSkills = new Set(existing.skills.map((s) => norm(s.name)));
  for (const s of resume.skills) {
    const key = norm(s.name);
    if (!key || seenSkills.has(key)) {
      plan.skills.duplicates++;
      continue;
    }
    seenSkills.add(key);
    plan.skills.create.push({ name: s.name, level: s.level ?? null });
  }

  return plan;
}

/** Number of rows a plan would write. */
export function planSize(plan: ImportPlan): number {
  return (
    plan.experiences.create.length +
    plan.education.create.length +
    plan.skills.create.length +
    Object.keys(plan.account).length +
    (plan.jobTitle ? 1 : 0)
  );
}
