import { and, asc, eq, inArray } from 'drizzle-orm';
import {
  noGos,
  platformConnections,
  profiles,
  searchNoGos,
  searches,
  settings as settingsTable,
  type ExperienceLevel,
  type Locale,
  type NewSearch,
  type RemoteMode,
  type Search,
  type Settings,
} from '@apply/db';
import { getDb } from '@/lib/db';
import type { Source } from '@/types/platforms';

/**
 * The "settings" surface the UI knows about.
 *
 * Historically stored as a single flat JSON blob; now assembled from three
 * tables (`settings`, `profiles`, `searches` + `search_no_gos`). We keep the
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

// The UI historically used numbers in "k€" (e.g. 40 means 40k). The DB stores
// raw euros. Convert at the boundary so the UI stays unchanged.
const EUR_PER_K = 1000;
const toK = (eur: number | null | undefined): number | null =>
  eur == null ? null : Math.round(eur / EUR_PER_K);
const toEur = (k: number | null | undefined): number | null =>
  k == null ? null : k * EUR_PER_K;

const REMOTE_LABELS_EN: Record<RemoteMode, string> = {
  remote: 'Remote',
  hybrid: 'Hybrid',
  onsite: 'On-site',
};

function labelFromRemoteMode(mode: RemoteMode | null): string[] {
  return mode ? [REMOTE_LABELS_EN[mode]] : [];
}

function remoteModeFromLabels(labels: readonly string[]): RemoteMode | null {
  const norm = labels.map((l) => l.toLowerCase());
  if (norm.includes('remote') || norm.includes('télétravail') || norm.includes('teletravail')) {
    return 'remote';
  }
  if (norm.includes('hybrid') || norm.includes('hybride')) return 'hybrid';
  if (norm.includes('on-site') || norm.includes('onsite') || norm.includes('présentiel') || norm.includes('presentiel')) {
    return 'onsite';
  }
  return null;
}

// Experience levels: DB stores canonical lowercase tokens (CHECK constraint).
// The UI historically used the French-canonical forms as keys
// ('Junior' | 'Confirmé' | 'Senior' | 'Lead'), translated at render time via
// the local LEVEL_EN / experienceOptions maps. We round-trip those forms so
// every existing callsite (settings form chips, offers criteria row) works
// unchanged.
const EXPERIENCE_LABELS: Record<ExperienceLevel, string> = {
  entry: 'Junior',
  mid: 'Confirmé',
  senior: 'Senior',
  lead: 'Lead',
};

function labelsFromExperienceLevels(
  levels: readonly ExperienceLevel[] | null | undefined,
): string[] {
  return (levels ?? []).map((l) => EXPERIENCE_LABELS[l]).filter(Boolean);
}

function experienceLevelsFromLabels(labels: readonly string[]): ExperienceLevel[] {
  const out: ExperienceLevel[] = [];
  for (const raw of labels) {
    const l = raw.trim().toLowerCase();
    if (!l) continue;
    if (l === 'entry' || l === 'junior' || l === 'débutant' || l === 'debutant' || l === 'jr') {
      out.push('entry');
    } else if (l === 'mid' || l === 'confirmed' || l === 'confirmé' || l === 'confirme' || l === 'intermédiaire' || l === 'intermediaire') {
      out.push('mid');
    } else if (l === 'senior' || l === 'sénior' || l === 'sr') {
      out.push('senior');
    } else if (l === 'lead' || l === 'staff' || l === 'principal') {
      out.push('lead');
    }
  }
  // Dedup while preserving order.
  return Array.from(new Set(out));
}

/** Resolve the default profile (settings.defaultProfileId → first by id). */
function getDefaultProfileId(settingsRow: Settings | null): string | null {
  if (settingsRow?.defaultProfileId) return settingsRow.defaultProfileId;
  const db = getDb();
  const [p] = db.select({ id: profiles.id }).from(profiles).orderBy(asc(profiles.id)).limit(1).all();
  return p?.id ?? null;
}

/** Resolve the "primary" search for a profile — used as the AppSettings backing row. */
function getPrimarySearch(profileId: string): Search | null {
  const db = getDb();
  const [s] = db
    .select()
    .from(searches)
    .where(eq(searches.profileId, profileId))
    .orderBy(asc(searches.createdAt))
    .limit(1)
    .all();
  return s ?? null;
}

function slugify(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Read AppSettings from the DB, composing across settings + profile + search. */
export async function readSettings(): Promise<AppSettings> {
  const db = getDb();

  const [row] = db.select().from(settingsTable).where(eq(settingsTable.id, 'default')).limit(1).all();
  const profileId = getDefaultProfileId(row ?? null);
  const profile = profileId
    ? db.select().from(profiles).where(eq(profiles.id, profileId)).limit(1).all()[0] ?? null
    : null;
  const search = profileId ? getPrimarySearch(profileId) : null;

  // Aggregate noGo labels for the primary search — in the user's locale.
  const locale: Locale = row?.locale ?? 'fr';
  const labelCol = locale === 'fr' ? noGos.labelFr : noGos.labelEn;
  const noGoLabels = search
    ? db
        .select({ label: labelCol })
        .from(searchNoGos)
        .innerJoin(noGos, eq(searchNoGos.noGoId, noGos.id))
        .where(eq(searchNoGos.searchId, search.id))
        .all()
        .map((r) => r.label)
    : [];

  // "searchTitles" is an array in the UI. We map each search's title for the
  // default profile into it so the UI can still show them as chips.
  const allSearchTitles = profileId
    ? db
        .select({ title: searches.searchTitle })
        .from(searches)
        .where(eq(searches.profileId, profileId))
        .orderBy(asc(searches.createdAt))
        .all()
        .map((r) => r.title)
    : [];

  return {
    firstName: row?.firstName ?? '',
    lastName: row?.lastName ?? '',
    jobTitle: profile?.jobTitle ?? '',
    location: search?.location ?? '',
    availability: '', // not persisted in new schema
    searchTitles: allSearchTitles,
    contractTypes: (search?.contractTypes ?? []) as string[],
    experienceLevels: labelsFromExperienceLevels(
      (search?.experienceLevels ?? null) as ExperienceLevel[] | null,
    ),
    searchLocation: search?.location ?? '',
    companySizes: [], // not persisted in new schema
    salaryMin: toK(search?.salaryMinEur),
    salaryMax: toK(search?.salaryMaxEur),
    remotePreference: labelFromRemoteMode(search?.remoteMode ?? null),
    noGos: noGoLabels,
  };
}

/** Patch AppSettings — writes are split across the underlying tables. */
export async function writeSettings(patch: Partial<AppSettings>): Promise<void> {
  const db = getDb();
  const nowIso = new Date().toISOString();

  const [existing] = db.select().from(settingsTable).where(eq(settingsTable.id, 'default')).limit(1).all();

  // --- 1. Upsert the settings row (profile fields live here) ------------------
  const needsSettingsPatch =
    'firstName' in patch || 'lastName' in patch;
  if (needsSettingsPatch) {
    if (existing) {
      db.update(settingsTable)
        .set({
          firstName: 'firstName' in patch ? patch.firstName ?? null : existing.firstName,
          lastName: 'lastName' in patch ? patch.lastName ?? null : existing.lastName,
          updatedAt: nowIso,
        })
        .where(eq(settingsTable.id, 'default'))
        .run();
    } else {
      db.insert(settingsTable)
        .values({
          id: 'default',
          firstName: patch.firstName ?? null,
          lastName: patch.lastName ?? null,
          createdAt: nowIso,
          updatedAt: nowIso,
        })
        .run();
    }
  }

  const profileId = getDefaultProfileId(existing ?? null);

  // --- 2. `jobTitle` goes on the default profile row --------------------------
  if ('jobTitle' in patch && profileId) {
    db.update(profiles)
      .set({ jobTitle: patch.jobTitle ?? '', updatedAt: nowIso })
      .where(eq(profiles.id, profileId))
      .run();
  }

  // --- 3. Search criteria go on the "primary" search for the default profile --
  const searchFields = [
    'searchLocation',
    'location',
    'contractTypes',
    'experienceLevels',
    'salaryMin',
    'salaryMax',
    'remotePreference',
  ] as const;
  const touchesSearch = searchFields.some((k) => k in patch);
  if (touchesSearch && profileId) {
    const primary = getPrimarySearch(profileId);
    const newLocation =
      'searchLocation' in patch
        ? patch.searchLocation ?? null
        : 'location' in patch
          ? patch.location ?? null
          : primary?.location ?? null;
    const newContracts = 'contractTypes' in patch
      ? ((patch.contractTypes ?? []) as NewSearch['contractTypes'])
      : primary?.contractTypes ?? null;
    const newLevels = 'experienceLevels' in patch
      ? (experienceLevelsFromLabels(patch.experienceLevels ?? []) as NewSearch['experienceLevels'])
      : primary?.experienceLevels ?? null;
    const newRemote =
      'remotePreference' in patch
        ? remoteModeFromLabels(patch.remotePreference ?? [])
        : primary?.remoteMode ?? null;
    const newSalaryMin =
      'salaryMin' in patch ? toEur(patch.salaryMin) : primary?.salaryMinEur ?? null;
    const newSalaryMax =
      'salaryMax' in patch ? toEur(patch.salaryMax) : primary?.salaryMaxEur ?? null;

    if (primary) {
      db.update(searches)
        .set({
          location: newLocation,
          contractTypes: newContracts,
          experienceLevels: newLevels,
          remoteMode: newRemote,
          salaryMinEur: newSalaryMin,
          salaryMaxEur: newSalaryMax,
          updatedAt: nowIso,
        })
        .where(eq(searches.id, primary.id))
        .run();
    } else {
      // No search exists yet for this profile — create one so subsequent
      // readSettings() picks up the criteria. Title falls back to profile's job title.
      const [prof] = db.select({ jobTitle: profiles.jobTitle }).from(profiles).where(eq(profiles.id, profileId)).limit(1).all();
      const generatedId = `srch-${Date.now().toString(36)}`;
      db.insert(searches)
        .values({
          id: generatedId,
          profileId,
          searchTitle: prof?.jobTitle ?? 'Search',
          location: newLocation,
          contractTypes: newContracts,
          experienceLevels: newLevels,
          remoteMode: newRemote,
          salaryMinEur: newSalaryMin,
          salaryMaxEur: newSalaryMax,
          createdAt: nowIso,
          updatedAt: nowIso,
        })
        .run();
    }
  }

  // --- 4. noGos are a many-to-many (search_no_gos) on the primary search ------
  if ('noGos' in patch && profileId) {
    const primary = getPrimarySearch(profileId);
    if (primary) {
      const labels = patch.noGos ?? [];
      await reconcileNoGos(primary.id, labels, existing?.locale ?? 'fr', nowIso);
    }
  }
}

/**
 * Best-effort reconcile between the submitted noGo labels and the `no_gos` +
 * `search_no_gos` tables. Labels matching an existing row (by EN or FR label)
 * are reused; unknown labels get a fresh non-built-in row inserted with the
 * label duplicated across both locales.
 */
async function reconcileNoGos(
  searchId: string,
  labels: readonly string[],
  locale: Locale,
  nowIso: string,
): Promise<void> {
  const db = getDb();
  // Resolve each label → noGoId.
  const resolvedIds: string[] = [];
  for (const label of labels) {
    const trimmed = label.trim();
    if (!trimmed) continue;
    const [match] = db
      .select({ id: noGos.id })
      .from(noGos)
      .where(locale === 'fr' ? eq(noGos.labelFr, trimmed) : eq(noGos.labelEn, trimmed))
      .limit(1)
      .all();
    if (match) {
      resolvedIds.push(match.id);
      continue;
    }
    // Unknown → insert a fresh non-built-in row.
    const id = `ngo-${slugify(trimmed)}-${Date.now().toString(36)}`;
    const key = slugify(trimmed) || id;
    db.insert(noGos)
      .values({
        id,
        key,
        labelEn: trimmed,
        labelFr: trimmed,
        isBuiltIn: false,
        createdAt: nowIso,
        updatedAt: nowIso,
      })
      .onConflictDoNothing()
      .run();
    // Re-select in case onConflict hit (existing row with same key).
    const [freshOrExisting] = db.select({ id: noGos.id }).from(noGos).where(eq(noGos.key, key)).limit(1).all();
    if (freshOrExisting) resolvedIds.push(freshOrExisting.id);
  }

  // Reconcile join rows.
  db.delete(searchNoGos).where(eq(searchNoGos.searchId, searchId)).run();
  if (resolvedIds.length > 0) {
    for (const noGoId of resolvedIds) {
      db.insert(searchNoGos).values({ searchId, noGoId }).run();
    }
  }
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

// Kept for compat but no longer used — `and`/`inArray` only referenced here to
// keep the import tree-shake happy in case we need range queries later.
void and;
void inArray;
