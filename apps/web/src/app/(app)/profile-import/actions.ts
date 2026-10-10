'use server';

import type { ActionResult } from '@apply/core/candidate-profile';
import { type ParseMethod, type ParsedResume, validateParsedResume } from '@apply/core/resume';
import * as candidate from '@/lib/candidate-profile';
import { type ImportReport, applyProfileImport } from '@/lib/profileImport';
import { parseResumeText } from '@/lib/resume/parse';
import { getSupabaseScope, type SupabaseScope } from '@/lib/supabase/scope';

/**
 * Server actions of the resume import (APP-110, APP-120). Like the other profile
 * actions they never throw to the client: signed out answers `signed-out`, a
 * refusal from Supabase (tables missing) answers `unavailable`.
 *
 * Privacy: the resume text only comes from the user's own document row (read
 * under Row Level Security) and goes through `parseResumeText`, which stays on
 * the built-in rules unless the Claude provider is explicitly enabled.
 */

async function run<T>(what: string, work: (scope: SupabaseScope) => Promise<T>): Promise<ActionResult<T>> {
  const scope = await getSupabaseScope();
  if (!scope) return { ok: false, reason: 'signed-out', message: 'Sign in to import your resume.' };
  try {
    return { ok: true, data: await work(scope) };
  } catch (error) {
    if (error instanceof candidate.InvalidInputError) return { ok: false, reason: 'invalid', message: error.message };
    console.error(`[resume import] ${what} failed:`, error);
    return { ok: false, reason: 'unavailable', message: 'This is not available yet. Please try again later.' };
  }
}

export interface ParsedDocument {
  resume: ParsedResume;
  method: ParseMethod;
}

/** Parses the text kept with an uploaded CV (see `registerDocument`) into a profile draft to review. */
export async function parseDocumentResume(documentId: string): Promise<ActionResult<ParsedDocument>> {
  return run('parsing a document', async (s) => {
    const documents = await candidate.listDocuments(s);
    const document = documents.find((d) => d.id === documentId && d.kind === 'cv');
    if (!document) throw new candidate.InvalidInputError('This document no longer exists.');
    if (!document.extractedText?.trim()) {
      throw new candidate.InvalidInputError(
        'We could not read text in this file (scanned or protected). You can fill your profile by hand.',
      );
    }
    const { resume, method } = await parseResumeText(document.extractedText);
    return { resume, method };
  });
}

/**
 * Saves a reviewed draft. The client sends what the user confirmed; it is
 * validated again here, so a tampered payload can only produce a clean (and
 * size-limited) draft, written under the user's own Row Level Security.
 */
export async function importParsedProfile(raw: unknown): Promise<ActionResult<ImportReport>> {
  return run('importing a resume', (s) => applyProfileImport(s, validateParsedResume(raw).resume));
}
