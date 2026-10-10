import { type ImportPlan, type ParsedResume, planProfileImport } from '@apply/core/resume';
import * as candidate from '@/lib/candidate-profile';
import type { SupabaseScope } from '@/lib/supabase/scope';

/**
 * Writes a reviewed resume into the profile tables (APP-110). The plan comes
 * from `planProfileImport` (pure, tested in packages/core): it only lists rows
 * that do not exist yet, so a second import of the same resume adds nothing.
 * Nothing is overwritten or deleted. Each section is written on its own: one
 * refused row is counted in `failed` and the rest still go through.
 *
 * Only tables that exist today are written. Languages, certifications, links,
 * the summary and the location wait for the APP-119 migration.
 */

export interface ImportReport {
  created: { experiences: number; education: number; skills: number; name: boolean; jobTitle: boolean };
  /** Already in the profile. */
  duplicates: { experiences: number; education: number; skills: number };
  /** Rows the database requires more data for (a job title and a start date, a school). */
  incomplete: { experiences: number; education: number };
  /** Rows the database refused. */
  failed: number;
  keptForLater: ImportPlan['keptForLater'];
}

async function defaultProfileTitle(s: SupabaseScope): Promise<string | null> {
  const { data, error } = await s.supabase
    .from('profiles')
    .select('job_title')
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(1);
  if (error) throw new Error(`Supabase profiles: ${error.message}`);
  return ((data?.[0] as { job_title: string } | undefined)?.job_title) ?? null;
}

export async function applyProfileImport(s: SupabaseScope, resume: ParsedResume): Promise<ImportReport> {
  const [account, jobTitle, experiences, education, skills] = await Promise.all([
    candidate.getAccount(s),
    defaultProfileTitle(s),
    candidate.listExperiences(s),
    candidate.listEducation(s),
    candidate.listSkills(s),
  ]);

  const plan = planProfileImport(
    resume,
    {
      firstName: account.firstName,
      lastName: account.lastName,
      jobTitle,
      experiences: experiences.map((e) => ({ title: e.title, companyName: e.companyName, startedAt: e.startedAt })),
      education: education.map((e) => ({ school: e.school, degree: e.degree, endedAt: e.endedAt })),
      skills: skills.map((k) => ({ name: k.name })),
    },
    { placeholderJobTitle: candidate.PLACEHOLDER_JOB_TITLE },
  );

  let failed = 0;
  const attempt = async (write: () => Promise<unknown>) => {
    try {
      await write();
      return true;
    } catch (error) {
      if (!(error instanceof candidate.InvalidInputError)) console.error('[profile import] write failed:', error);
      failed++;
      return false;
    }
  };

  let name = false;
  if (plan.account.firstName || plan.account.lastName) {
    name = await attempt(() =>
      candidate.updateAccountName(s, {
        firstName: plan.account.firstName ?? account.firstName,
        lastName: plan.account.lastName ?? account.lastName,
      }),
    );
  }
  let title = false;
  if (plan.jobTitle) title = await attempt(() => candidate.setDefaultProfileTitle(s, plan.jobTitle as string));

  // Sequential on purpose: the first write creates the default profile when there is none.
  let createdExperiences = 0;
  for (const input of plan.experiences.create) if (await attempt(() => candidate.upsertExperience(s, input))) createdExperiences++;
  let createdEducation = 0;
  for (const input of plan.education.create) if (await attempt(() => candidate.upsertEducation(s, input))) createdEducation++;
  let createdSkills = 0;
  for (const input of plan.skills.create) if (await attempt(() => candidate.upsertSkill(s, input))) createdSkills++;

  return {
    created: { experiences: createdExperiences, education: createdEducation, skills: createdSkills, name, jobTitle: title },
    duplicates: { experiences: plan.experiences.duplicates, education: plan.education.duplicates, skills: plan.skills.duplicates },
    incomplete: { experiences: plan.experiences.incomplete, education: plan.education.incomplete },
    failed,
    keptForLater: plan.keptForLater,
  };
}
