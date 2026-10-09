import type { Profile } from '@apply/db';
import { getSupabaseScope } from '@/lib/supabase/scope';
import * as supabaseData from '@/lib/supabase/queries';
import { demoProfiles } from '@/lib/demo';
import { IS_DEMO } from '@/lib/hosted';

/**
 * All profiles, alphabetised by job title. Pre-sorted here so the sidebar and
 * profiles page can render without their own sort. Supabase for signed-in
 * users, fixtures for the hosted demo, nothing otherwise.
 */
export async function readProfiles(): Promise<Profile[]> {
  const scope = await getSupabaseScope();
  if (scope) return supabaseData.readProfiles(scope);
  return IS_DEMO ? demoProfiles() : [];
}

export async function readProfile(id: string): Promise<Profile | null> {
  const scope = await getSupabaseScope();
  if (scope) return supabaseData.readProfile(scope, id);
  return IS_DEMO ? (demoProfiles().find((p) => p.id === id) ?? null) : null;
}
