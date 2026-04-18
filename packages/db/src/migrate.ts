import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

import type { DrizzleDB } from './client.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Default location of the generated Drizzle migrations folder.
 *
 * Resolved relative to this file so it works both:
 *   - in dev via tsx (src/migrate.ts → ../drizzle/migrations)
 *   - from the packaged Electron build, as long as `drizzle/migrations/**`
 *     is included in electron-builder's `files` and unpacked alongside.
 */
export const DEFAULT_MIGRATIONS_FOLDER = path.resolve(
  __dirname,
  '..',
  'drizzle',
  'migrations',
);

/**
 * Apply all pending Drizzle migrations on the given DB handle.
 *
 * Called at Electron main-process boot, and also from the standalone
 * `pnpm --filter @apply/db migrate` script (which targets `.local/apply.sqlite`
 * for local development without spinning up Electron).
 */
export function runMigrations(
  db: DrizzleDB,
  migrationsFolder: string = DEFAULT_MIGRATIONS_FOLDER,
): void {
  migrate(db, { migrationsFolder });
}
