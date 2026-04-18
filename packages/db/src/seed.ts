import type { DrizzleDB } from './client.js';
import { noGos, platforms } from './schema.js';

/**
 * Idempotent reference-data seed.
 *
 * Populates rows that Apply considers "built-in" and that the user does not
 * create themselves:
 *   - the 4 supported scraping platforms (slugs are referenced by offers.fk)
 *   - the default catalog of no-go sectors, with both EN & FR labels
 *
 * Safe to re-run any number of times: every insert uses ON CONFLICT DO NOTHING
 * so existing rows (including user edits) are preserved.
 */

const PLATFORM_SEEDS: ReadonlyArray<typeof platforms.$inferInsert> = [
  {
    slug: 'linkedin',
    label: 'LinkedIn',
    brandColor: '#0A66C2',
    loginUrl: 'https://www.linkedin.com/login',
  },
  {
    slug: 'wttj',
    label: 'Welcome to the Jungle',
    brandColor: '#FFC619',
    loginUrl: 'https://www.welcometothejungle.com/fr/signin',
  },
  {
    slug: 'hellowork',
    label: 'HelloWork',
    brandColor: '#FD3345',
    loginUrl: 'https://www.hellowork.com/fr-fr/candidat/login.html',
  },
  {
    slug: 'jobsthatmakesense',
    label: 'JobsThatMakeSense',
    brandColor: '#006A4E',
    loginUrl: 'https://www.jobs_that_makesense.org/fr/login',
  },
];

type BuiltInNoGo = {
  key: string;
  labelEn: string;
  labelFr: string;
};

const BUILT_IN_NO_GOS: readonly BuiltInNoGo[] = [
  { key: 'defense',      labelEn: 'Defense & weapons', labelFr: 'Défense & armement' },
  { key: 'gambling',     labelEn: 'Gambling',          labelFr: "Jeux d'argent" },
  { key: 'tobacco',      labelEn: 'Tobacco',           labelFr: 'Tabac' },
  { key: 'fossil-fuels', labelEn: 'Fossil fuels',      labelFr: 'Énergies fossiles' },
  { key: 'adult',        labelEn: 'Adult industry',    labelFr: 'Industrie adulte' },
  { key: 'fast-fashion', labelEn: 'Fast fashion',      labelFr: 'Mode jetable' },
];

export interface SeedResult {
  platformsInserted: number;
  noGosInserted: number;
}

export function runSeed(db: DrizzleDB): SeedResult {
  const nowIso = new Date().toISOString();
  let platformsInserted = 0;
  let noGosInserted = 0;

  for (const row of PLATFORM_SEEDS) {
    const result = db.insert(platforms).values(row).onConflictDoNothing().run();
    if (result.changes > 0) platformsInserted += 1;
  }

  for (const n of BUILT_IN_NO_GOS) {
    const result = db
      .insert(noGos)
      .values({
        // Use the stable `key` as the PK too for built-ins, so re-seeding the
        // same key re-resolves to the same row (simplifies join lookups).
        id: n.key,
        key: n.key,
        labelEn: n.labelEn,
        labelFr: n.labelFr,
        isBuiltIn: true,
        createdAt: nowIso,
        updatedAt: nowIso,
      })
      .onConflictDoNothing()
      .run();
    if (result.changes > 0) noGosInserted += 1;
  }

  return { platformsInserted, noGosInserted };
}
