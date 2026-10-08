import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { eq } from 'drizzle-orm';
import { v7 as uuidv7 } from 'uuid';

import type { DrizzleDB } from '../client.js';
import { openDatabase } from '../client.js';
import { runMigrations } from '../migrate.js';
import {
  type ApplicationStatus,
  type Contract,
  CONTRACT_VALUES,
  type ExperienceLevel,
  EXPERIENCE_LEVEL_VALUES,
  type InterviewStage,
  INTERVIEW_STAGE_VALUES,
  type RemoteMode,
  applications,
  companies,
  interviews,
  noGos,
  offers,
  profiles,
  searchNoGos,
  searches,
  settings,
} from '../schema.js';
import { runSeed } from '../seed.js';

// =============================================================================
// Paths
// =============================================================================

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const DB_PATH = path.join(REPO_ROOT, '.local', 'apply.sqlite');
const WEB_DATA_DIR = path.join(REPO_ROOT, 'apps', 'web', 'data');
const OUTPUT_DIR = path.join(REPO_ROOT, '.local', 'output');

// =============================================================================
// Legacy JSON shapes (verbatim, as scraped or hand-edited)
// =============================================================================

type LegacyProfile = { id: string; jobTitle: string };
type LegacyProfilesFile = { profiles: LegacyProfile[] };

type LegacyOfferGroup = {
  id: string;
  searchTitle: string;
  location?: string;
  profileId: string;
};
type LegacyOfferGroupsFile = { offerGroups: LegacyOfferGroup[] };

type LegacyApplication = {
  id: string;
  company: string;
  jobTitle: string;
  appliedAt: string;
  status: string;
  profileId: string;
};
type LegacyInterview = {
  id: string;
  applicationId: string;
  company: string;
  jobTitle: string;
  stage: string;
};
type LegacyApplicationsFile = {
  applications: LegacyApplication[];
  interviews: LegacyInterview[];
};

type LegacySettings = {
  firstName?: string;
  lastName?: string;
  jobTitle?: string;
  location?: string;
  availability?: string;
  searchTitles?: string[];
  contractTypes?: string[];
  experienceLevels?: string[];
  searchLocation?: string;
  companySizes?: string[];
  salaryMin?: number;
  salaryMax?: number;
  remotePreference?: string[];
  noGos?: string[];
};

type LegacyJob = {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  source: string;
  contract?: string;
  salary?: string;
  postedAt?: string;
  scrapedAt?: string;
};
type LegacyJobsFile = { scrapedAt?: string; total?: number; jobs: LegacyJob[] };

// =============================================================================
// Helpers
// =============================================================================

function readJsonIfExists<T>(filePath: string): T | null {
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf-8').trim();
  if (!raw) return null;
  return JSON.parse(raw) as T;
}

function backup(paths: readonly string[], label: string): void {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  for (const p of paths) {
    if (!fs.existsSync(p)) continue;
    const backupPath = `${p}.backup-${stamp}`;
    fs.cpSync(p, backupPath, { recursive: true });
    console.log(`  \u21B3 [${label}] backup: ${path.relative(REPO_ROOT, backupPath)}`);
  }
}

function parseRemoteModeFromLocation(location: string | undefined): RemoteMode | null {
  if (!location) return null;
  const lower = location.toLowerCase();
  if (lower.includes('hybride') || lower.includes('hybrid')) return 'hybrid';
  if (lower.includes('sur site') || lower.includes('on site') || lower.includes('onsite'))
    return 'onsite';
  if (lower.includes('\u00e0 distance') || lower.includes('remote') || lower.includes('t\u00e9l\u00e9travail'))
    return 'remote';
  return null;
}

function mapContract(raw: string | undefined): Contract | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  return (CONTRACT_VALUES as readonly string[]).includes(trimmed)
    ? (trimmed as Contract)
    : null;
}

/** Keep only legacy contract labels that match the new CHECK constraint. */
function filterLegacyContracts(raw: readonly string[] | undefined): Contract[] {
  if (!raw || raw.length === 0) return [];
  const kept: Contract[] = [];
  for (const c of raw) {
    const mapped = mapContract(c);
    if (mapped && !kept.includes(mapped)) kept.push(mapped);
  }
  return kept;
}

/** Legacy free-text FR/EN level → canonical enum token. */
function mapExperienceLevel(raw: string | undefined): ExperienceLevel | null {
  if (!raw) return null;
  const lower = raw.trim().toLowerCase();
  if ((EXPERIENCE_LEVEL_VALUES as readonly string[]).includes(lower)) {
    return lower as ExperienceLevel;
  }
  if (['junior', 'd\u00e9butant', 'debutant', 'jr', 'entry', 'entry-level'].includes(lower)) {
    return 'entry';
  }
  if (['confirm\u00e9', 'confirme', 'confirmed', 'interm\u00e9diaire', 'intermediaire', 'mid', 'mid-level'].includes(lower)) {
    return 'mid';
  }
  if (['s\u00e9nior', 'senior', 'sr'].includes(lower)) return 'senior';
  if (['lead', 'staff', 'principal', 'tech lead'].includes(lower)) return 'lead';
  return null;
}

function filterLegacyLevels(raw: readonly string[] | undefined): ExperienceLevel[] {
  if (!raw || raw.length === 0) return [];
  const kept: ExperienceLevel[] = [];
  for (const l of raw) {
    const mapped = mapExperienceLevel(l);
    if (mapped && !kept.includes(mapped)) kept.push(mapped);
  }
  return kept;
}

/**
 * Legacy `remotePreference` was a free multi-select (e.g. ["Hybride","Présentiel"]).
 * The new schema only carries one `remoteMode` per search — we pick the first
 * recognized entry so no user input is dropped silently, preserving the
 * "remote > hybrid > onsite" preference order when multiple apply.
 */
function pickLegacyRemoteMode(raw: readonly string[] | undefined): RemoteMode | null {
  if (!raw || raw.length === 0) return null;
  const norm = raw.map((r) => r.toLowerCase().trim());
  if (norm.some((r) => r === 'remote' || r === 't\u00e9l\u00e9travail' || r === 'teletravail' || r === '\u00e0 distance' || r === 'a distance')) {
    return 'remote';
  }
  if (norm.some((r) => r === 'hybride' || r === 'hybrid')) return 'hybrid';
  if (norm.some((r) => r === 'pr\u00e9sentiel' || r === 'presentiel' || r === 'on-site' || r === 'onsite' || r === 'sur site')) {
    return 'onsite';
  }
  return null;
}

function mapApplicationStatus(raw: string): ApplicationStatus {
  switch (raw) {
    case 'pending-waiting':
    case 'waiting':
      return 'waiting';
    case 'interviewing':
      return 'interviewing';
    case 'accepted':
      return 'accepted';
    case 'rejected':
      return 'rejected';
    case 'ghosted':
      return 'ghosted';
    case 'withdrawn':
      return 'withdrawn';
    default:
      return 'waiting';
  }
}

function mapInterviewStage(raw: string): { stage: InterviewStage; originalIfOther: string | null } {
  const trimmed = raw.trim();
  if ((INTERVIEW_STAGE_VALUES as readonly string[]).includes(trimmed)) {
    return { stage: trimmed as InterviewStage, originalIfOther: null };
  }
  const lower = trimmed.toLowerCase();
  if (lower.includes('hr') || lower.includes('rh')) return { stage: 'HR', originalIfOther: null };
  if (lower.includes('manager')) return { stage: 'Manager', originalIfOther: null };
  if (lower.includes('design')) return { stage: 'Design Case', originalIfOther: null };
  if (lower.includes('team') || lower.includes('fit'))
    return { stage: 'Team-Fit', originalIfOther: null };
  if (lower.includes('tech')) return { stage: 'Technical', originalIfOther: null };
  if (lower.includes('final')) return { stage: 'Final', originalIfOther: null };
  return { stage: 'Other', originalIfOther: trimmed };
}

/**
 * Legacy free-text no-go label → canonical `no_gos.key`. Aliases chosen from
 * the user's current settings.json. Anything unknown is created on the fly
 * as a custom (non-built-in) no-go so no user data is lost.
 */
const NO_GO_LEGACY_ALIASES: Record<string, string> = {
  'd\u00e9fense / militaire': 'defense',
  armement: 'defense',
  'jeux d\u2019argent': 'gambling',
  "jeux d'argent": 'gambling',
  'industrie adulte': 'adult',
  'tabac / alcool': 'tobacco',
  '\u00e9nergies fossiles': 'fossil-fuels',
  'fast fashion': 'fast-fashion',
};

function slugifyForNoGoKey(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// =============================================================================
// Main
// =============================================================================

interface MigrationStats {
  profiles: number;
  searches: number;
  applications: number;
  interviews: number;
  offers: number;
  companies: number;
  noGos: { added: number; linked: number };
  settings: boolean;
}

function migrate(db: DrizzleDB): MigrationStats {
  const stats: MigrationStats = {
    profiles: 0,
    searches: 0,
    applications: 0,
    interviews: 0,
    offers: 0,
    companies: 0,
    noGos: { added: 0, linked: 0 },
    settings: false,
  };
  const nowIso = new Date().toISOString();

  // Read the legacy settings once up front so we can fold its criteria into
  // every `searches` row of the default profile (the legacy model stored
  // criteria globally at the user level; the new one stores them per search).
  const settingsFile = readJsonIfExists<LegacySettings>(
    path.join(WEB_DATA_DIR, 'settings.json'),
  );
  const legacyContracts = filterLegacyContracts(settingsFile?.contractTypes);
  const legacyLevels = filterLegacyLevels(settingsFile?.experienceLevels);
  const legacyRemote = pickLegacyRemoteMode(settingsFile?.remotePreference);
  // Legacy salaries were in k\u20AC (40 === 40 000\u20AC/year). DB stores raw EUR.
  const legacySalaryMinEur =
    typeof settingsFile?.salaryMin === 'number' ? settingsFile.salaryMin * 1000 : null;
  const legacySalaryMaxEur =
    typeof settingsFile?.salaryMax === 'number' ? settingsFile.salaryMax * 1000 : null;
  const hasLegacyCriteria =
    legacyContracts.length > 0 ||
    legacyLevels.length > 0 ||
    legacyRemote !== null ||
    legacySalaryMinEur !== null ||
    legacySalaryMaxEur !== null;

  return db.transaction((tx) => {
    // -------------------------------------------------------------------------
    // Profiles
    // -------------------------------------------------------------------------
    const profilesFile = readJsonIfExists<LegacyProfilesFile>(
      path.join(WEB_DATA_DIR, 'profiles.json'),
    );
    const defaultProfileIdFromFile = profilesFile?.profiles[0]?.id ?? null;
    if (profilesFile) {
      for (const [idx, p] of profilesFile.profiles.entries()) {
        tx.insert(profiles)
          .values({
            id: p.id,
            jobTitle: p.jobTitle,
            isDefault: idx === 0,
            description: null,
            createdAt: nowIso,
            updatedAt: nowIso,
          })
          .onConflictDoUpdate({
            target: profiles.id,
            set: { jobTitle: p.jobTitle, updatedAt: nowIso },
          })
          .run();
        stats.profiles += 1;
      }
    }

    // -------------------------------------------------------------------------
    // Searches (ex-offer-groups)
    // -------------------------------------------------------------------------
    const offerGroupsFile = readJsonIfExists<LegacyOfferGroupsFile>(
      path.join(WEB_DATA_DIR, 'offer-groups.json'),
    );
    if (offerGroupsFile) {
      for (const g of offerGroupsFile.offerGroups) {
        // Legacy settings.json held criteria globally — fold them onto every
        // search of the default profile so the UI criteria chips come back.
        const isDefaultProfileSearch =
          hasLegacyCriteria && defaultProfileIdFromFile === g.profileId;

        const contractTypes = isDefaultProfileSearch && legacyContracts.length > 0
          ? legacyContracts
          : null;
        const experienceLevels = isDefaultProfileSearch && legacyLevels.length > 0
          ? legacyLevels
          : null;
        const remoteMode = isDefaultProfileSearch ? legacyRemote : null;
        const salaryMinEur = isDefaultProfileSearch ? legacySalaryMinEur : null;
        const salaryMaxEur = isDefaultProfileSearch ? legacySalaryMaxEur : null;
        const searchLocation =
          g.location || (isDefaultProfileSearch ? settingsFile?.searchLocation ?? null : null);

        tx.insert(searches)
          .values({
            id: g.id,
            profileId: g.profileId,
            searchTitle: g.searchTitle,
            location: searchLocation,
            contractTypes,
            experienceLevels,
            remoteMode,
            salaryMinEur,
            salaryMaxEur,
            enabledPlatforms: null,
            createdAt: nowIso,
            updatedAt: nowIso,
          })
          .onConflictDoUpdate({
            target: searches.id,
            set: {
              profileId: g.profileId,
              searchTitle: g.searchTitle,
              location: searchLocation,
              contractTypes,
              experienceLevels,
              remoteMode,
              salaryMinEur,
              salaryMaxEur,
              updatedAt: nowIso,
            },
          })
          .run();
        stats.searches += 1;
      }
    }

    // -------------------------------------------------------------------------
    // Settings + NoGos linked to the default search
    // (settingsFile was hoisted above so criteria could be folded into searches)
    // -------------------------------------------------------------------------
    if (settingsFile) {
      tx.insert(settings)
        .values({
          id: 'default',
          firstName: settingsFile.firstName || null,
          lastName: settingsFile.lastName || null,
          avatarUrl: null,
          email: null,
          linkedinUrl: null,
          defaultProfileId: null,
          locale: 'fr',
          themeMode: 'system',
          createdAt: nowIso,
          updatedAt: nowIso,
        })
        .onConflictDoUpdate({
          target: settings.id,
          set: {
            firstName: settingsFile.firstName || null,
            lastName: settingsFile.lastName || null,
            updatedAt: nowIso,
          },
        })
        .run();
      stats.settings = true;

      // Migrate settings.noGos → no_gos catalog + attach to every search.
      // Previously the list was global (one per user); now we model it as
      // per-search criteria, so we attach the full set to every legacy search.
      const legacyNoGoLabels = settingsFile.noGos ?? [];
      const resolvedNoGoIds: string[] = [];
      for (const rawLabel of legacyNoGoLabels) {
        const lowered = rawLabel.toLowerCase();
        let key = NO_GO_LEGACY_ALIASES[lowered];
        if (!key) key = slugifyForNoGoKey(rawLabel);

        // Is it already in the catalog (built-in seed or prior run)?
        const existing = tx
          .select({ id: noGos.id })
          .from(noGos)
          .where(eq(noGos.key, key))
          .get();

        let noGoId: string;
        if (existing) {
          noGoId = existing.id;
        } else {
          noGoId = key;
          tx.insert(noGos)
            .values({
              id: noGoId,
              key,
              // Custom no-gos we can't translate → store the raw in both
              // columns; user can edit later from Settings UI.
              labelEn: rawLabel,
              labelFr: rawLabel,
              isBuiltIn: false,
              createdAt: nowIso,
              updatedAt: nowIso,
            })
            .run();
          stats.noGos.added += 1;
        }
        resolvedNoGoIds.push(noGoId);
      }

      if (resolvedNoGoIds.length > 0 && offerGroupsFile) {
        for (const g of offerGroupsFile.offerGroups) {
          for (const noGoId of resolvedNoGoIds) {
            tx.insert(searchNoGos)
              .values({ searchId: g.id, noGoId })
              .onConflictDoNothing()
              .run();
            stats.noGos.linked += 1;
          }
        }
      }
    }

    // -------------------------------------------------------------------------
    // Offers + Companies (dedup on company name)
    // -------------------------------------------------------------------------
    const jobFiles: string[] = [
      path.join(OUTPUT_DIR, 'jobs.json'),
      path.join(OUTPUT_DIR, 'jobs-linkedin.json'),
      path.join(OUTPUT_DIR, 'jobs-wttj.json'),
    ];

    const companyIdByName = new Map<string, string>();
    const findOrCreateCompany = (rawName: string): string => {
      const name = rawName.trim();
      const cached = companyIdByName.get(name);
      if (cached) return cached;

      const existing = tx
        .select({ id: companies.id })
        .from(companies)
        .where(eq(companies.name, name))
        .get();
      if (existing) {
        companyIdByName.set(name, existing.id);
        return existing.id;
      }

      const id = uuidv7();
      tx.insert(companies)
        .values({
          id,
          name,
          domain: null,
          linkedinHandle: null,
          sector: null,
          size: null,
          headquarters: null,
          description: null,
          logoUrl: null,
          createdAt: nowIso,
          updatedAt: nowIso,
        })
        .run();
      companyIdByName.set(name, id);
      stats.companies += 1;
      return id;
    };

    for (const jobsPath of jobFiles) {
      const file = readJsonIfExists<LegacyJobsFile>(jobsPath);
      if (!file || !Array.isArray(file.jobs)) continue;

      for (const job of file.jobs) {
        if (!job.company || !job.url || !job.id) continue;

        const platformSlug =
          job.source === 'linkedin'
            ? 'linkedin'
            : job.source === 'wttj'
              ? 'wttj'
              : job.source === 'hellowork'
                ? 'hellowork'
                : job.source === 'jobsthatmakesense'
                  ? 'jobsthatmakesense'
                  : null;
        if (!platformSlug) continue;

        const companyId = findOrCreateCompany(job.company);
        const seenAt = job.scrapedAt ?? file.scrapedAt ?? nowIso;

        tx.insert(offers)
          .values({
            id: job.id,
            platformSlug,
            companyId,
            externalId: job.id,
            url: job.url,
            title: job.title,
            location: job.location || '',
            remoteMode: parseRemoteModeFromLocation(job.location),
            contract: mapContract(job.contract),
            experienceLevel: null,
            salaryMinEur: null,
            salaryMaxEur: null,
            salaryRaw: job.salary ?? null,
            description: job.description || '',
            descriptionHtml: null,
            postedAt: job.postedAt || null,
            firstSeenAt: seenAt,
            lastSeenAt: seenAt,
            userStatus: 'new',
            createdAt: nowIso,
            updatedAt: nowIso,
          })
          .onConflictDoUpdate({
            target: offers.id,
            set: {
              title: job.title,
              location: job.location || '',
              description: job.description || '',
              lastSeenAt: seenAt,
              updatedAt: nowIso,
            },
          })
          .run();
        stats.offers += 1;
      }
    }

    // -------------------------------------------------------------------------
    // Applications + Interviews
    // -------------------------------------------------------------------------
    const applicationsFile = readJsonIfExists<LegacyApplicationsFile>(
      path.join(WEB_DATA_DIR, 'applications.json'),
    );
    if (applicationsFile) {
      for (const app of applicationsFile.applications) {
        const companyId = findOrCreateCompany(app.company);

        tx.insert(applications)
          .values({
            id: app.id,
            offerId: null,
            profileId: app.profileId,
            companyId,
            jobTitle: app.jobTitle,
            appliedAt: app.appliedAt,
            status: mapApplicationStatus(app.status),
            coverLetter: null,
            notes: null,
            createdAt: nowIso,
            updatedAt: nowIso,
          })
          .onConflictDoUpdate({
            target: applications.id,
            set: {
              companyId,
              jobTitle: app.jobTitle,
              appliedAt: app.appliedAt,
              status: mapApplicationStatus(app.status),
              updatedAt: nowIso,
            },
          })
          .run();
        stats.applications += 1;
      }

      for (const iv of applicationsFile.interviews) {
        const mapped = mapInterviewStage(iv.stage);
        tx.insert(interviews)
          .values({
            id: iv.id,
            applicationId: iv.applicationId,
            stage: mapped.stage,
            scheduledAt: null,
            completedAt: null,
            outcome: null,
            notes: mapped.originalIfOther ? `Legacy stage: ${mapped.originalIfOther}` : null,
            createdAt: nowIso,
            updatedAt: nowIso,
          })
          .onConflictDoUpdate({
            target: interviews.id,
            set: {
              applicationId: iv.applicationId,
              stage: mapped.stage,
              updatedAt: nowIso,
            },
          })
          .run();
        stats.interviews += 1;
      }
    }

    // -------------------------------------------------------------------------
    // Housekeeping: default profile (first row) → settings.defaultProfileId
    // -------------------------------------------------------------------------
    const defaultProfile = tx
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.isDefault, true))
      .get();
    if (defaultProfile) {
      tx.update(settings)
        .set({ defaultProfileId: defaultProfile.id, updatedAt: nowIso })
        .where(eq(settings.id, 'default'))
        .run();
    }

    return stats;
  });
}

// =============================================================================
// Entry point
// =============================================================================

console.log(`\u2b50 Legacy JSON \u2192 SQLite migration`);
console.log(`    target DB: ${DB_PATH}\n`);

// Backups first (safe even if partial)
console.log('\u2192 Creating backups...');
backup([WEB_DATA_DIR], 'web/data');
backup(
  [
    path.join(OUTPUT_DIR, 'jobs.json'),
    path.join(OUTPUT_DIR, 'jobs-linkedin.json'),
    path.join(OUTPUT_DIR, 'jobs-wttj.json'),
  ],
  'output',
);
console.log('');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const handle = openDatabase(DB_PATH);
try {
  console.log('\u2192 Applying pending migrations...');
  runMigrations(handle.db);

  console.log('\u2192 Seeding reference data (platforms, built-in no-gos)...');
  const seedResult = runSeed(handle.db);
  console.log(
    `    +${seedResult.platformsInserted} platforms, +${seedResult.noGosInserted} no-gos.\n`,
  );

  console.log('\u2192 Migrating legacy JSON...');
  const stats = migrate(handle.db);

  console.log('\n\u2705 Migration complete');
  console.log(`    profiles      : ${stats.profiles}`);
  console.log(`    searches      : ${stats.searches}`);
  console.log(`    no-gos added  : ${stats.noGos.added}`);
  console.log(`    no-go links   : ${stats.noGos.linked}`);
  console.log(`    offers        : ${stats.offers}`);
  console.log(`    companies new : ${stats.companies}`);
  console.log(`    applications  : ${stats.applications}`);
  console.log(`    interviews    : ${stats.interviews}`);
  console.log(`    settings      : ${stats.settings ? 'migrated' : 'no file'}`);
} finally {
  handle.close();
}
