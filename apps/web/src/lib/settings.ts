import { platformConnections } from '@apply/db';
import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import * as supabaseSettings from '@/lib/settings-supabase';
import { getSupabaseScope } from '@/lib/supabase/scope';
import { demoSettings } from '@/lib/demo';
import { IS_DEMO } from '@/lib/hosted';
import type { Source } from '@apply/core/platforms';

/**
 * The "settings" surface the UI knows about.
 *
 * Historically stored as a single flat JSON blob; now assembled from Supabase
 * tables (`accounts`, `profiles`, `searches` + `search_no_gos`). We keep the
 * flat shape for the UI during this refactor so the Settings page components
 * don't need a rewrite in this plan — the next plan tackles the UI split.
 *
 * Fields with no home in the new schema (`availability`, `companySizes`) are
 * still accepted by the type but never persisted; they round-trip as empty.
 */
export interface AppSettings {
  // Profile
  firstName: string;
  lastName: string;
  jobTitle: string;
  location: string;
  availability: string;

  // Search criteria (back the "default" search for the default profile)
  searchTitles: string[];
  contractTypes: string[];
  experienceLevels: string[];
  searchLocation: string;
  companySizes: string[];
  salaryMin: number | null;
  salaryMax: number | null;
  remotePreference: string[];
  noGos: string[];
}

export const DEFAULT_SETTINGS: AppSettings = {
  firstName: '',
  lastName: '',
  jobTitle: '',
  location: '',
  availability: '',
  searchTitles: [],
  contractTypes: [],
  experienceLevels: [],
  searchLocation: '',
  companySizes: [],
  salaryMin: null,
  salaryMax: null,
  remotePreference: [],
  noGos: [],
};

/**
 * Read AppSettings. Supabase for signed-in users, fixtures for the hosted demo,
 * empty defaults otherwise.
 */
export async function readSettings(): Promise<AppSettings> {
  const scope = await getSupabaseScope();
  if (scope) return supabaseSettings.readSettings(scope);
  return IS_DEMO ? demoSettings() : DEFAULT_SETTINGS;
}

/** Patch AppSettings. Signed-out visitors and the read-only demo have nothing to save. */
export async function writeSettings(patch: Partial<AppSettings>): Promise<void> {
  const scope = await getSupabaseScope();
  if (scope) return supabaseSettings.writeSettings(scope, patch);
}

/**
 * Whether we have scraped auth cookies captured for a given platform.
 * Reads from `platform_connections.cookieFilePath`; a row with a non-null path
 * counts as "connected" even if the actual cookies are expired (the v2 plan
 * will add freshness). We also keep back-compat with the old
 * `.local/cookies/<source>.json` convention for the transition window, via an
 * env-var override.
 */
export async function checkSourceConnected(source: Source): Promise<boolean> {
  // Platform sessions stay on the user's device (ADR-004), not in Supabase.
  if ((await getSupabaseScope()) || IS_DEMO) return false;

  const db = getDb();
  const [conn] = db
    .select()
    .from(platformConnections)
    .where(eq(platformConnections.platformSlug, source))
    .limit(1)
    .all();
  if (conn && (conn.cookieFilePath || conn.cookieBlob)) return true;

  // Legacy fallback: peek at the JSON cookies file if it still exists.
  const cookiesDir = process.env.COOKIES_DIR;
  if (!cookiesDir) return false;
  try {
    const { accessSync } = await import('node:fs');
    const { join } = await import('node:path');
    accessSync(join(cookiesDir, `${source}.json`));
    return true;
  } catch {
    return false;
  }
}

// Re-export the composed-schema row types so consumers don't reach into @apply/db.
export type { Source };
