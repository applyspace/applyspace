import { asc, eq } from 'drizzle-orm';
import { profiles, type Profile } from '@apply/db';
import { getDb } from '@/lib/db';

/**
 * All profiles, alphabetised by job title. Pre-sorted here so the sidebar and
 * profiles page can render without their own sort.
 */
export async function readProfiles(): Promise<Profile[]> {
  const db = getDb();
  return db.select().from(profiles).orderBy(asc(profiles.jobTitle)).all();
}

export async function readProfile(id: string): Promise<Profile | null> {
  const db = getDb();
  const [row] = await db.select().from(profiles).where(eq(profiles.id, id)).limit(1);
  return row ?? null;
}
