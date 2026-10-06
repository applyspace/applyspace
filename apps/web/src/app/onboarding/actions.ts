'use server';

import { redirect } from 'next/navigation';
import { CONTRACT_VALUES, EXPERIENCE_LEVEL_VALUES, type Contract, type ExperienceLevel } from '@apply/db';
import * as candidate from '@/lib/candidate-profile';
import { extractDocxText } from '@/lib/docxText';
import { getSupabaseScope, type SupabaseScope } from '@/lib/supabase/scope';
import {
  CV_MAX_BYTES,
  CV_MIME_TYPES,
  SKILL_LEVEL_VALUES,
  type ActionResult,
  type DocumentEntry,
  type DocumentUploadInput,
  type DocumentsData,
  type EducationEntry,
  type EducationInput,
  type ExperienceEntry,
  type ExperienceInput,
  type FirstSearchInput,
  type FitMessageInput,
  type ProfileData,
  type SkillEntry,
  type SkillInput,
} from '@/types/candidate-profile';

/**
 * Server actions for the candidate profile, shared by onboarding and the
 * profile editor in Settings. None of them throws to the client: without a
 * signed-in user (demo, desktop) they answer `signed-out`, and when Supabase
 * refuses (for instance the tables do not exist yet) they answer `unavailable`.
 */

const SIGNED_OUT: ActionResult<never> = {
  ok: false,
  reason: 'signed-out',
  message: 'Sign in to save your profile.',
};

async function run<T>(what: string, work: (scope: SupabaseScope) => Promise<T>): Promise<ActionResult<T>> {
  const scope = await getSupabaseScope();
  if (!scope) return SIGNED_OUT;
  try {
    return { ok: true, data: await work(scope) };
  } catch (error) {
    if (error instanceof candidate.InvalidInputError) {
      return { ok: false, reason: 'invalid', message: error.message };
    }
    console.error(`[profile] ${what} failed:`, error);
    return {
      ok: false,
      reason: 'unavailable',
      message: 'This is not available yet. Please try again later.',
    };
  }
}

/** A section that cannot be read becomes null instead of failing the whole editor. */
async function orNull<T>(what: string, read: Promise<T>): Promise<T | null> {
  try {
    return await read;
  } catch (error) {
    console.error(`[profile] reading ${what} failed:`, error);
    return null;
  }
}

// --- profile editor ----------------------------------------------------------

export async function loadProfileData(): Promise<ProfileData> {
  const scope = await getSupabaseScope();
  if (!scope) return { status: 'signed-out' };
  const [experiences, education, skills] = await Promise.all([
    orNull('experiences', candidate.listExperiences(scope)),
    orNull('education', candidate.listEducation(scope)),
    orNull('skills', candidate.listSkills(scope)),
  ]);
  return { status: 'ready', experiences, education, skills };
}

export async function saveExperience(input: ExperienceInput): Promise<ActionResult<ExperienceEntry>> {
  return run('saving an experience', (s) => candidate.upsertExperience(s, input));
}

export async function removeExperience(id: string): Promise<ActionResult> {
  return run('deleting an experience', (s) => candidate.deleteExperience(s, id));
}

export async function saveEducation(input: EducationInput): Promise<ActionResult<EducationEntry>> {
  return run('saving education', (s) => candidate.upsertEducation(s, input));
}

export async function removeEducation(id: string): Promise<ActionResult> {
  return run('deleting education', (s) => candidate.deleteEducation(s, id));
}

export async function saveSkill(input: SkillInput): Promise<ActionResult<SkillEntry>> {
  return run('saving a skill', (s) => {
    const level = SKILL_LEVEL_VALUES.find((l) => l === input.level) ?? null;
    return candidate.upsertSkill(s, { ...input, level });
  });
}

export async function removeSkill(id: string): Promise<ActionResult> {
  return run('deleting a skill', (s) => candidate.deleteSkill(s, id));
}

// --- documents ---------------------------------------------------------------

export async function loadDocuments(): Promise<DocumentsData> {
  const scope = await getSupabaseScope();
  if (!scope) return { status: 'signed-out' };
  const documents = await orNull('documents', candidate.listDocuments(scope));
  return documents ? { status: 'ready', documents } : { status: 'unavailable' };
}

/**
 * Records a CV the browser has just uploaded to Storage. A .docx also gets its
 * plain text extracted (kept in `extracted_text`); a PDF is stored as is.
 */
export async function registerDocument(input: DocumentUploadInput): Promise<ActionResult<DocumentEntry>> {
  return run('registering a document', async (s) => {
    const allowed: string[] = Object.values(CV_MIME_TYPES);
    if (!allowed.includes(input.mimeType)) {
      throw new candidate.InvalidInputError('Upload a PDF or a Word (.docx) file.');
    }
    if (!(input.sizeBytes > 0 && input.sizeBytes <= CV_MAX_BYTES)) {
      throw new candidate.InvalidInputError('The file must be 10 MB or smaller.');
    }
    if (input.kind !== 'cv' && input.kind !== 'other') {
      throw new candidate.InvalidInputError('Unknown document type.');
    }

    let text: string | null = null;
    if (input.mimeType === CV_MIME_TYPES.docx && input.storagePath.startsWith(`${s.userId}/`)) {
      try {
        text = extractDocxText(await candidate.downloadDocument(s, input.storagePath));
      } catch {
        // Text extraction is a bonus: the document is still recorded.
      }
    }
    return candidate.insertDocument(s, input, text);
  });
}

export async function saveFitMessage(input: FitMessageInput): Promise<ActionResult<DocumentEntry>> {
  return run('saving a fit message', (s) => candidate.upsertFitMessage(s, input));
}

export async function makeDocumentPrimary(id: string): Promise<ActionResult> {
  return run('setting the primary document', (s) => candidate.setPrimaryDocument(s, id));
}

export async function removeDocument(id: string): Promise<ActionResult> {
  return run('deleting a document', (s) => candidate.deleteDocument(s, id));
}

// --- onboarding ----------------------------------------------------------------

export async function saveName(name: { firstName: string; lastName: string }): Promise<ActionResult> {
  return run('saving the name', (s) => candidate.updateAccountName(s, name));
}

/** Creates (or updates) the user's first search profile from the onboarding criteria. */
export async function saveFirstSearch(input: FirstSearchInput): Promise<ActionResult> {
  return run('saving the first search', async (s) => {
    const titles = input.titles.map((t) => t.trim()).filter(Boolean);
    if (titles.length === 0) throw new candidate.InvalidInputError('Add at least one job title.');
    await candidate.saveFirstSearch(s, {
      titles,
      location: input.location,
      // Only canonical tokens reach the database (CHECK constraints).
      contractTypes: input.contractTypes.filter((c): c is Contract => CONTRACT_VALUES.includes(c)),
      experienceLevels: input.experienceLevels.filter((l): l is ExperienceLevel =>
        EXPERIENCE_LEVEL_VALUES.includes(l),
      ),
    });
  });
}

/**
 * Ends onboarding, finished or skipped: stamps `accounts.onboarded_at` and
 * sends the user to Home. The redirect happens even if the stamp fails, so
 * nobody gets stuck here.
 */
export async function completeOnboarding(): Promise<never> {
  await run('completing onboarding', (s) => candidate.markOnboarded(s));
  redirect('/');
}
