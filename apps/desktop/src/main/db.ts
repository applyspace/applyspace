import fs from 'node:fs';
import path from 'node:path';

import { openDatabase, runMigrations, runSeed } from '@apply/db';
import { app } from 'electron';

/**
 * Resolve the absolute path to the SQLite database file.
 *
 *  - `app.isPackaged === false` (dev):  `<repo>/.local/apply.sqlite`
 *    Same location `pnpm db:migrate` / `db:studio` target, so contributors
 *    can run drizzle-studio in parallel with the Electron app.
 *
 *  - `app.isPackaged === true` (prod):  `app.getPath('userData')/apply.sqlite`
 *    This lives under the OS per-user app-data dir — survives reinstalls,
 *    doesn't require write access to the .app bundle.
 */
export function resolveDbPath(): string {
  if (app.isPackaged) {
    return path.join(app.getPath('userData'), 'apply.sqlite');
  }
  // In dev the main-process file is at apps/desktop/dist/main/db.js,
  // so 4 levels up lands at the repo root.
  const repoRoot = path.resolve(app.getAppPath(), '..', '..');
  return path.join(repoRoot, '.local', 'apply.sqlite');
}

/**
 * Ensure the DB file + its schema exist at boot:
 *   1. mkdir -p the containing dir
 *   2. open it (WAL + foreign_keys ON — see packages/db client)
 *   3. apply any pending migrations
 *   4. seed reference data (platforms, built-in no-gos) — idempotent
 *   5. close the handle
 *
 * The Next.js subprocess (spawned later in the boot sequence) opens its own
 * connection against the same file — SQLite handles concurrent readers/writers
 * under WAL without coordination from us.
 */
export function initializeDatabase(dbPath: string): void {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const handle = openDatabase(dbPath);
  try {
    runMigrations(handle.db);
    runSeed(handle.db);
  } finally {
    handle.close();
  }
}
