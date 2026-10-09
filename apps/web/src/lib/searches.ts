import type { Search } from '@apply/db/schema';
import { getSupabaseScope } from '@/lib/supabase/scope';
import * as supabaseData from '@/lib/supabase/queries';
import { demoSearches } from '@/lib/demo';
import { isDemoRequest } from '@/lib/hosted';

/**
 * All searches across every profile. Ordered by `(profileId, searchTitle)` so
 * the sidebar's search list is stable from one render to the next.
 *
 * A "search" is the table that replaces the legacy JSON "offer-groups": it
 * captures a profile's search criteria (title, location, contracts, remote,
 * salary…) and ultimately feeds the scraper. Supabase for signed-in users,
 * fixtures for the hosted demo, nothing otherwise.
 */
export async function readSearches(): Promise<Search[]> {
  const scope = await getSupabaseScope();
  if (scope) return supabaseData.readSearches(scope);
  return (await isDemoRequest()) ? demoSearches() : [];
}

export async function readSearch(id: string): Promise<Search | null> {
  const scope = await getSupabaseScope();
  if (scope) return supabaseData.readSearch(scope, id);
  return (await isDemoRequest()) ? (demoSearches().find((s) => s.id === id) ?? null) : null;
}

export async function readSearchesForProfile(profileId: string): Promise<Search[]> {
  const scope = await getSupabaseScope();
  if (scope) return supabaseData.readSearchesForProfile(scope, profileId);
  return (await isDemoRequest()) ? demoSearches().filter((s) => s.profileId === profileId) : [];
}
