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
 * Whether session cookies are captured on this device for a given platform:
 * `<COOKIES_DIR>/<source>.json`, written by the login capture. Platform
 * sessions stay on the user's device (ADR-004) and never reach Supabase; the
 * hosted build and the demo have no `COOKIES_DIR`, so they report none. A
 * keychain-backed store comes with the in-app login capture.
 */
export async function checkSourceConnected(source: Source): Promise<boolean> {
  if (IS_DEMO) return false;
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
