'use server';

import { revalidatePath } from 'next/cache';
import { APPLICATION_STATUS_VALUES } from '@apply/db/schema';
import { applicationCap, type ApplicationStatus } from '@apply/core/applications';
import { validateNewApplication, type NewApplicationInput } from '@/lib/applicationsCreate';
import { entrySlug } from '@/lib/slug';
import { getSupabaseScope } from '@/lib/supabase/scope';
import { UUID_RE } from '@/lib/supabase/rows';

export type ApplicationActionResult = { ok: true } | { ok: false; message: string };

const isStatus = (value: string): value is ApplicationStatus =>
  (APPLICATION_STATUS_VALUES as readonly string[]).includes(value);

/**
 * Moves an application to another status. Ownership is enforced by Row Level
 * Security: another user's application updates zero rows and reads as not found.
 */
export async function updateApplicationStatus(
  id: string,
  status: string,
): Promise<ApplicationActionResult> {
  if (!UUID_RE.test(id) || !isStatus(status)) {
    return { ok: false, message: 'Invalid application or status.' };
  }
  const scope = await getSupabaseScope();
  if (!scope) return { ok: false, message: 'Sign in to update an application.' };

  const { data, error } = await scope.supabase
    .from('applications')
    .update({ status })
    .eq('id', id)
    .select('id');
  if (error) return { ok: false, message: error.message };
  if (!data || data.length === 0) return { ok: false, message: 'This application no longer exists.' };

  revalidatePath('/applications');
  return { ok: true };
}

export type CreateApplicationResult =
  | { ok: true; id: string; slug: string; warning?: 'documents' }
  | { ok: false; reason: 'signed-out' | 'invalid' | 'cap' | 'profile' | 'failed'; message: string };

/** True when Postgres or PostgREST says a column does not exist yet (hub migration not applied). */
const isMissingColumn = (error: { code?: string; message: string }) =>
  error.code === 'PGRST204' || error.code === '42703' || /column .* (does not exist|of relation)|could not find the/i.test(error.message);

/**
 * Creates an application by hand. The company is found by name (case
 * insensitive) or created; the plan cap is checked here for a friendly message
 * and enforced again by the database trigger. If the hub migration has not been
 * applied yet, the link and the location are kept at the top of the notes
 * instead of their own columns.
 */
export async function createApplication(input: NewApplicationInput): Promise<CreateApplicationResult> {
  const checked = validateNewApplication(input);
  if (!checked.ok) return { ok: false, reason: 'invalid', message: checked.message };
  const app = checked.value;

  const scope = await getSupabaseScope();
  if (!scope) return { ok: false, reason: 'signed-out', message: 'Sign in to add an application.' };
  const { supabase, userId } = scope;

  try {
    const [{ count, error: countError }, account, profile] = await Promise.all([
      supabase.from('applications').select('id', { count: 'exact', head: true }),
      supabase.from('accounts').select('plan').eq('id', userId).maybeSingle(),
      supabase.from('profiles').select('id').order('is_default', { ascending: false }).limit(1).maybeSingle(),
    ]);
    if (countError) return { ok: false, reason: 'failed', message: countError.message };
    const cap = applicationCap((account.data?.plan as string | undefined) ?? null);
    if (cap !== null && (count ?? 0) >= cap) {
      return { ok: false, reason: 'cap', message: `Your plan includes up to ${cap} applications.` };
    }
    if (!profile.data) {
      return { ok: false, reason: 'profile', message: 'Create your profile before adding an application.' };
    }

    // Company: reuse one with the same name, else create it.
    const { data: companies, error: companiesError } = await supabase.from('companies').select('id, name');
    if (companiesError) return { ok: false, reason: 'failed', message: companiesError.message };
    let companyId = companies?.find((c) => (c.name as string).toLowerCase() === app.companyName.toLowerCase())?.id as
      | string
      | undefined;
    if (!companyId) {
      const { data: created, error } = await supabase
        .from('companies')
        .insert({ user_id: userId, name: app.companyName })
        .select('id')
        .single();
      if (error) return { ok: false, reason: 'failed', message: error.message };
      companyId = created.id as string;
    }

    const base = {
      user_id: userId,
      profile_id: profile.data.id as string,
      company_id: companyId,
      offer_id: app.offerId,
      job_title: app.jobTitle,
      applied_at: app.appliedAt,
      status: app.status,
    };
    const details = { url: app.url, location: app.location, deadline_at: app.deadlineAt };

    let result = await supabase
      .from('applications')
      .insert({ ...base, ...details, notes: app.notes })
      .select('id')
      .single();
    if (result.error && isMissingColumn(result.error)) {
      const header = [app.url && `Link: ${app.url}`, app.location && `Location: ${app.location}`, app.deadlineAt && `Deadline: ${app.deadlineAt.slice(0, 10)}`];
      const notes = [header.filter(Boolean).join('\n'), app.notes].filter(Boolean).join('\n\n') || null;
      result = await supabase.from('applications').insert({ ...base, notes }).select('id').single();
    }
    if (result.error) {
      if (/plan_limit_applications/.test(result.error.message)) {
        return { ok: false, reason: 'cap', message: 'Your plan limit on applications is reached.' };
      }
      return { ok: false, reason: 'failed', message: result.error.message };
    }
    const id = result.data.id as string;

    let warning: 'documents' | undefined;
    if (app.documentIds.length > 0) {
      const { error } = await supabase
        .from('application_documents')
        .insert(app.documentIds.map((document_id) => ({ application_id: id, document_id, user_id: userId })));
      if (error) warning = 'documents';
    }

    revalidatePath('/applications');
    return { ok: true, id, slug: entrySlug([app.companyName, app.jobTitle], id), warning };
  } catch (error) {
    return { ok: false, reason: 'failed', message: error instanceof Error ? error.message : 'Something went wrong.' };
  }
}
