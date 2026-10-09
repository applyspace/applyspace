import type {
  ApplicationWithRelations,
  InterviewWithRelations,
} from '@apply/core/applications';
import { getSupabaseScope } from '@/lib/supabase/scope';
import * as supabaseData from '@/lib/supabase/queries';

// Supabase for signed-in users; the hosted demo and signed-out visitors have none.

/**
 * All applications, newest `appliedAt` first. Pre-joins `company` (the FK now
 * owns the company name) and `offer` (nullable — `null` when the user logged
 * an application that didn't come from the scraper).
 */
export async function readApplications(): Promise<ApplicationWithRelations[]> {
  const scope = await getSupabaseScope();
  return scope ? supabaseData.readApplications(scope) : [];
}

export async function readApplication(
  id: string,
): Promise<ApplicationWithRelations | null> {
  const scope = await getSupabaseScope();
  return scope ? supabaseData.readApplication(scope, id) : null;
}

/**
 * All interviews, newest `createdAt` first. Pre-joins its parent application
 * and that application's company so the sidebar / list pages can render
 * "{company}, {jobTitle}" without a second query.
 */
export async function readInterviews(): Promise<InterviewWithRelations[]> {
  const scope = await getSupabaseScope();
  return scope ? supabaseData.readInterviews(scope) : [];
}

export async function readInterview(
  id: string,
): Promise<InterviewWithRelations | null> {
  const scope = await getSupabaseScope();
  return scope ? supabaseData.readInterview(scope, id) : null;
}
