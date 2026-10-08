import { eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import {
  companies,
  offers,
  profiles,
  searches,
  settings,
  type Contract,
  type DrizzleDB,
  type RemoteMode,
} from '@apply/db';
import snapshot from '@/data/demo-offers.json';

/**
 * Demo content for the hosted version: one search profile ("Product Designer",
 * mid-level, WTTJ) and the offers from a committed snapshot of that search.
 *
 * The snapshot is produced by `pnpm --filter @apply/scraper demo:snapshot`
 * (no account needed) so the public demo never calls WTTJ at request time.
 * Idempotent: does nothing once the demo profile exists.
 */

const DEMO_PROFILE_ID = 'demo-profile';

interface SnapshotJob {
  id: string;
  title: string;
  company: string;
  location?: string;
  contract?: string;
  salary?: string;
  description?: string;
  url: string;
  postedAt?: string;
  scrapedAt?: string;
}

const CONTRACTS: readonly string[] = ['CDI', 'CDD', 'Stage', 'Freelance', 'Apprentissage'];

function toContract(raw: string | undefined): Contract | null {
  return raw && CONTRACTS.includes(raw) ? (raw as Contract) : null;
}

function toRemoteMode(location: string): RemoteMode | null {
  const l = location.toLowerCase();
  if (l.includes('hybride') || l.includes('hybrid')) return 'hybrid';
  if (l.includes('sur site') || l.includes('onsite')) return 'onsite';
  if (l.includes('distance') || l.includes('remote') || l.includes('télétravail')) return 'remote';
  return null;
}

/** "45K à 60K €" → { min: 45000, max: 60000 } (best effort, raw kept alongside). */
function toSalary(raw: string | undefined): { min: number | null; max: number | null } {
  if (!raw) return { min: null, max: null };
  const nums = [...raw.toLowerCase().replace(/\s+/g, '').matchAll(/(\d{2,3})k/g)].map(
    (m) => Number(m[1]) * 1000,
  );
  return { min: nums[0] ?? null, max: nums[1] ?? null };
}

export function seedDemo(db: DrizzleDB): void {
  const exists = db.select({ id: profiles.id }).from(profiles).where(eq(profiles.id, DEMO_PROFILE_ID)).get();
  if (exists) return;

  const now = new Date().toISOString();

  db.transaction((tx) => {
    tx.insert(profiles)
      .values({
        id: DEMO_PROFILE_ID,
        jobTitle: 'Product Designer',
        isDefault: true,
        description: null,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    tx.insert(searches)
      .values({
        id: 'demo-search',
        profileId: DEMO_PROFILE_ID,
        searchTitle: 'Product Designer',
        location: 'France',
        contractTypes: ['CDI'],
        experienceLevels: ['mid'],
        remoteMode: null,
        salaryMinEur: null,
        salaryMaxEur: null,
        enabledPlatforms: ['wttj'],
        createdAt: now,
        updatedAt: now,
      })
      .run();

    tx.insert(settings)
      .values({
        id: 'default',
        defaultProfileId: DEMO_PROFILE_ID,
        locale: 'fr',
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: settings.id,
        set: { defaultProfileId: DEMO_PROFILE_ID, updatedAt: now },
      })
      .run();

    const companyIds = new Map<string, string>();
    for (const job of snapshot.jobs as SnapshotJob[]) {
      const name = job.company?.trim();
      if (!name || !job.url || !job.title) continue;

      let companyId = companyIds.get(name);
      if (!companyId) {
        companyId = randomUUID();
        tx.insert(companies)
          .values({
            id: companyId,
            name,
            domain: null,
            linkedinHandle: null,
            sector: null,
            size: null,
            headquarters: null,
            description: null,
            logoUrl: null,
            createdAt: now,
            updatedAt: now,
          })
          .onConflictDoNothing()
          .run();
        // A duplicate name keeps the existing row; read back the real id.
        const row = tx.select({ id: companies.id }).from(companies).where(eq(companies.name, name)).get();
        companyId = row?.id ?? companyId;
        companyIds.set(name, companyId);
      }

      const salary = toSalary(job.salary);
      const seenAt = job.scrapedAt ?? snapshot.scrapedAt ?? now;
      tx.insert(offers)
        .values({
          id: randomUUID(),
          platformSlug: 'wttj',
          companyId,
          externalId: job.id,
          url: job.url,
          title: job.title,
          location: job.location ?? '',
          remoteMode: toRemoteMode(job.location ?? ''),
          contract: toContract(job.contract),
          experienceLevel: 'mid',
          salaryMinEur: salary.min,
          salaryMaxEur: salary.max,
          salaryRaw: job.salary ?? null,
          description: job.description ?? '',
          descriptionHtml: null,
          postedAt: job.postedAt ?? null,
          firstSeenAt: seenAt,
          lastSeenAt: seenAt,
          userStatus: 'new',
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing()
        .run();
    }
  });
}
