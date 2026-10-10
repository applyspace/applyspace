'use server';

import { revalidatePath } from 'next/cache';
import { APPLICATION_STATUS_VALUES } from '@apply/db/schema';
import type { ApplicationStatus } from '@apply/core/applications';
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
