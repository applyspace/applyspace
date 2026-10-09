import { asc } from 'drizzle-orm';
import {
  platforms,
  platformConnections,
  type Platform,
  type PlatformConnection,
} from '@apply/db';
import { getDb } from '@/lib/db';
import { getSupabaseScope } from '@/lib/supabase/scope';
import * as supabaseData from '@/lib/supabase/queries';
import { demoPlatforms } from '@/lib/demo';
import { IS_DEMO } from '@/lib/hosted';

/** All known scraping platforms, in the order the seed inserted them. */
export async function readPlatforms(): Promise<Platform[]> {
  const scope = await getSupabaseScope();
  if (scope) return supabaseData.readPlatforms(scope);
  if (IS_DEMO) return demoPlatforms();
  const db = getDb();
  return db.select().from(platforms).orderBy(asc(platforms.slug)).all();
}

/** Per-platform connection state (cookies captured, last scrape timestamp…). */
export async function readPlatformConnections(): Promise<PlatformConnection[]> {
  // Platform sessions stay on the user's device and never reach the shared
  // database (ADR-004), so a signed-in hosted user has none here.
  if ((await getSupabaseScope()) || IS_DEMO) return [];
  const db = getDb();
  return db.select().from(platformConnections).all();
}
