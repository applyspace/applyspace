import { asc } from 'drizzle-orm';
import {
  platforms,
  platformConnections,
  type Platform,
  type PlatformConnection,
} from '@apply/db';
import { getDb } from '@/lib/db';

/** All known scraping platforms, in the order the seed inserted them. */
export async function readPlatforms(): Promise<Platform[]> {
  const db = getDb();
  return db.select().from(platforms).orderBy(asc(platforms.slug)).all();
}

/** Per-platform connection state (cookies captured, last scrape timestamp…). */
export async function readPlatformConnections(): Promise<PlatformConnection[]> {
  const db = getDb();
  return db.select().from(platformConnections).all();
}
