import type { Platform, PlatformConnection } from '@apply/db';

/**
 * The 4 platforms we scrape. Historically called `Source` in the codebase — we
 * keep the alias so we don't have to rename every consumer in one go. The set
 * of slugs MUST stay in sync with the rows inserted by `runSeed()` in
 * `packages/db/src/seed.ts`.
 */
export type Source = 'linkedin' | 'wttj' | 'hellowork' | 'jobsthatmakesense';

export type { Platform, PlatformConnection };
