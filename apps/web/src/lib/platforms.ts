import type { Platform } from '@apply/db/schema';
import { getSupabaseScope } from '@/lib/supabase/scope';
import * as supabaseData from '@/lib/supabase/queries';
import { demoPlatforms } from '@/lib/demo';
import { isDemoRequest } from '@/lib/hosted';

/** All known scraping platforms, by slug. Supabase for signed-in users, fixtures for the demo. */
export async function readPlatforms(): Promise<Platform[]> {
  const scope = await getSupabaseScope();
  if (scope) return supabaseData.readPlatforms(scope);
  return (await isDemoRequest()) ? demoPlatforms() : [];
}
