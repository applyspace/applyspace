import { asc, eq } from 'drizzle-orm';
import { searches, type Search } from '@apply/db';
import { getDb } from '@/lib/db';
import { getSupabaseScope } from '@/lib/supabase/scope';
import * as supabaseData from '@/lib/supabase/queries';

/**
 * All searches across every profile. Ordered by `(profileId, searchTitle)` so
 * the sidebar's search list is stable from one render to the next.
 *
 * A "search" is the table that replaces the legacy JSON "offer-groups": it
 * captures a profile's search criteria (title, location, contracts, remote,
 * salary…) and ultimately feeds the scraper.
 */
export async function readSearches(): Promise<Search[]> {
  const scope = await getSupabaseScope();
  if (scope) return supabaseData.readSearches(scope);
  const db = getDb();
  return db
    .select()
    .from(searches)
    .orderBy(asc(searches.profileId), asc(searches.searchTitle))
    .all();
}

export async function readSearch(id: string): Promise<Search | null> {
  const scope = await getSupabaseScope();
  if (scope) return supabaseData.readSearch(scope, id);
  const db = getDb();
  const [row] = await db.select().from(searches).where(eq(searches.id, id)).limit(1);
  return row ?? null;
}

export async function readSearchesForProfile(profileId: string): Promise<Search[]> {
  const scope = await getSupabaseScope();
  if (scope) return supabaseData.readSearchesForProfile(scope, profileId);
  const db = getDb();
  return db
    .select()
    .from(searches)
    .where(eq(searches.profileId, profileId))
    .orderBy(asc(searches.searchTitle))
    .all();
}
