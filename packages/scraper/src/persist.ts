import { and, eq } from 'drizzle-orm';
import { v7 as uuidv7 } from 'uuid';

import {
  CONTRACT_VALUES,
  companies,
  offers,
  platformConnections,
  profiles,
  searches,
  settings,
  type Contract,
  type DrizzleDB,
  type RemoteMode,
} from '@apply/db';

import type { Job, SearchCriteria, Source } from './types.js';

// =============================================================================
// Helpers — same parsing logic as `packages/db/scripts/migrate-legacy.ts` so
// that live scrapes and legacy imports end up with identical rows.
// =============================================================================

function parseRemoteModeFromLocation(location: string | undefined): RemoteMode | null {
  if (!location) return null;
  const lower = location.toLowerCase();
  if (lower.includes('hybride') || lower.includes('hybrid')) return 'hybrid';
  if (lower.includes('sur site') || lower.includes('on site') || lower.includes('onsite'))
    return 'onsite';
  if (lower.includes('à distance') || lower.includes('remote') || lower.includes('télétravail'))
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

/**
 * Extract an EUR annual salary range from a raw scraped string.
 *
 * Tolerant by design — platforms render salary in a dozen ways
 * ("45–60K€", "€50K/yr", "45000 - 60000 €", "50k"). Anything we can't parse
 * falls back to null and the raw string is preserved in `offers.salaryRaw`.
 */
export function parseSalary(raw: string | null | undefined): {
  min: number | null;
  max: number | null;
} {
  if (!raw) return { min: null, max: null };
  const s = raw.toLowerCase().replace(/,/g, '.').replace(/\s+/g, ' ');

  // "38-50k" / "38–50 k€" / "38 to 50k"
  const rangeK = s.match(/(\d{2,3})\s*(?:-|–|to)\s*(\d{2,3})\s*k/);
  if (rangeK) return { min: Number(rangeK[1]) * 1000, max: Number(rangeK[2]) * 1000 };

  // "50k" / "€50k/yr"
  const singleK = s.match(/(\d{2,3})\s*k/);
  if (singleK) return { min: Number(singleK[1]) * 1000, max: null };

  // "45000-60000" / "45000 – 60000"
  const rangeFull = s.match(/(\d{4,6})\s*(?:-|–|to)\s*(\d{4,6})/);
  if (rangeFull) return { min: Number(rangeFull[1]), max: Number(rangeFull[2]) };

  // "45000"
  const singleFull = s.match(/(\d{4,6})/);
  if (singleFull) return { min: Number(singleFull[1]), max: null };

  return { min: null, max: null };
}

// =============================================================================
// Criteria — aggregate across all searches for the default profile, preserving
// the existing `SearchCriteria` shape consumed by `platforms/*/url-builder.ts`.
// =============================================================================

export function loadCriteriaFromDb(db: DrizzleDB): SearchCriteria {
  // 1. Resolve default profile: settings.defaultProfileId → isDefault → first row.
  let profileId: string | null = null;

  const setting = db
    .select({ id: settings.defaultProfileId })
    .from(settings)
    .where(eq(settings.id, 'default'))
    .get();
  profileId = setting?.id ?? null;

  if (!profileId) {
    const dflt = db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.isDefault, true))
      .get();
    profileId = dflt?.id ?? null;
  }

  if (!profileId) {
    const first = db.select({ id: profiles.id }).from(profiles).limit(1).get();
    profileId = first?.id ?? null;
  }

  if (!profileId) {
    return { titles: [], location: 'France', contractTypes: [], remotePreference: [] };
  }

  // 2. Aggregate across every search attached to that profile.
  const rows = db.select().from(searches).where(eq(searches.profileId, profileId)).all();
  if (rows.length === 0) {
    return { titles: [], location: 'France', contractTypes: [], remotePreference: [] };
  }

  const titles = Array.from(new Set(rows.map((r) => r.searchTitle).filter(Boolean)));
  const location = rows.find((r) => r.location)?.location ?? 'France';
  const contractTypes = Array.from(
    new Set(rows.flatMap((r) => (Array.isArray(r.contractTypes) ? r.contractTypes : []))),
  );
  const experienceLevels = Array.from(
    new Set(rows.flatMap((r) => (Array.isArray(r.experienceLevels) ? r.experienceLevels : []))),
  );
  const remotePreference = Array.from(
    new Set(rows.map((r) => r.remoteMode).filter((v): v is RemoteMode => !!v)),
  );

  const salaryMins = rows.map((r) => r.salaryMinEur).filter((v): v is number => v != null);
  const salaryMaxs = rows.map((r) => r.salaryMaxEur).filter((v): v is number => v != null);
  const salaryMin = salaryMins.length ? Math.min(...salaryMins) : undefined;
  const salaryMax = salaryMaxs.length ? Math.max(...salaryMaxs) : undefined;

  return {
    titles,
    location,
    contractTypes,
    experienceLevels,
    remotePreference,
    salaryMin,
    salaryMax,
  };
}

// =============================================================================
// Persistence — upsert offers by (platformSlug, url) and dedup companies by name.
// =============================================================================

export interface PersistStats {
  /** Offers that didn't exist before (insert). */
  inserted: number;
  /** Offers matched on `(platformSlug, url)` — `lastSeenAt` + fields refreshed. */
  updated: number;
  /** Companies created during this run. */
  companiesNew: number;
  /** Offers skipped because they lacked `company`/`url`/`title`. */
  skipped: number;
}

export function persistJobs(db: DrizzleDB, jobs: Job[]): PersistStats {
  const stats: PersistStats = { inserted: 0, updated: 0, companiesNew: 0, skipped: 0 };
  const nowIso = new Date().toISOString();

  db.transaction((tx) => {
    // Per-transaction cache so we don't `SELECT` for the same company twice.
    const companyCache = new Map<string, string>();

    const findOrCreateCompany = (rawName: string): string | null => {
      const name = rawName.trim();
      if (!name) return null;

      const cached = companyCache.get(name);
      if (cached) return cached;

      const existing = tx
        .select({ id: companies.id })
        .from(companies)
        .where(eq(companies.name, name))
        .get();
      if (existing) {
        companyCache.set(name, existing.id);
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
      companyCache.set(name, id);
      stats.companiesNew += 1;
      return id;
    };

    for (const job of jobs) {
      if (!job.company || !job.url || !job.title) {
        stats.skipped += 1;
        continue;
      }

      const companyId = findOrCreateCompany(job.company);
      if (!companyId) {
        stats.skipped += 1;
        continue;
      }

      const salary = parseSalary(job.salary);
      const seenAt = job.scrapedAt || nowIso;

      const existing = tx
        .select({ id: offers.id })
        .from(offers)
        .where(and(eq(offers.platformSlug, job.source), eq(offers.url, job.url)))
        .get();

      const mutableFields = {
        companyId,
        externalId: job.id,
        title: job.title,
        location: job.location || '',
        remoteMode: parseRemoteModeFromLocation(job.location),
        contract: mapContract(job.contract),
        salaryMinEur: salary.min,
        salaryMaxEur: salary.max,
        salaryRaw: job.salary ?? null,
        description: job.description || '',
        postedAt: job.postedAt || null,
        lastSeenAt: seenAt,
        updatedAt: nowIso,
      } as const;

      if (existing) {
        tx.update(offers).set(mutableFields).where(eq(offers.id, existing.id)).run();
        stats.updated += 1;
      } else {
        tx.insert(offers)
          .values({
            ...mutableFields,
            id: uuidv7(),
            platformSlug: job.source,
            url: job.url,
            experienceLevel: null,
            descriptionHtml: null,
            firstSeenAt: seenAt,
            userStatus: 'new',
            createdAt: nowIso,
          })
          .run();
        stats.inserted += 1;
      }
    }
  });

  return stats;
}

/**
 * Stamp `platform_connections.lastScrapedAt = now` for a platform we just ran.
 * Row is created if missing so the Integrations UI always has something to read.
 */
export function touchPlatformLastScraped(db: DrizzleDB, slug: Source): void {
  const nowIso = new Date().toISOString();
  db.insert(platformConnections)
    .values({
      platformSlug: slug,
      connectedAt: null,
      lastScrapedAt: nowIso,
      cookieBlob: null,
      cookieFilePath: null,
    })
    .onConflictDoUpdate({
      target: platformConnections.platformSlug,
      set: { lastScrapedAt: nowIso },
    })
    .run();
}
