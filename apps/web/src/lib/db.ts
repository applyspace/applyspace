import fs from 'node:fs';
import path from 'node:path';
import { openDatabase, type DatabaseHandle, type DrizzleDB } from '@apply/db';

/**
 * Next.js-side DB singleton.
 *
 * The file this points at comes from one of two sources, depending on who
 * spawned the Next server:
 *
 *   1. In packaged Electron: `APPLY_DB_PATH` is injected by the main process
 *      (see apps/desktop/src/main/nextServer.ts) and points at the per-user
 *      SQLite file under `app.getPath('userData')`.
 *
 *   2. In dev: no env var is set; we walk up from `process.cwd()` to find
 *      the monorepo's `.local/apply.sqlite` so `pnpm --filter web dev` alone
 *      can talk to the same DB that `pnpm db:migrate` writes to.
 *
 * The handle is stashed on `globalThis` so Next.js' dev-mode module HMR does
 * not re-open (and re-lock) the DB on every reload.
 */

const GLOBAL_KEY = '__applyDbHandle__';

type GlobalStore = {
  [GLOBAL_KEY]?: DatabaseHandle;
};

function resolveDbPath(): string {
  const envPath = process.env.APPLY_DB_PATH;
  if (envPath) return envPath;

  // Walk up from cwd looking for a `.local` directory. Works whether Next is
  // launched from `apps/web/` (pnpm --filter web dev) or from repo root.
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    const candidate = path.join(dir, '.local', 'apply.sqlite');
    if (fs.existsSync(candidate)) return candidate;
    if (fs.existsSync(path.join(dir, '.local'))) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  // Final fallback: two levels up from cwd (apps/web/ → repo root).
  return path.resolve(process.cwd(), '..', '..', '.local', 'apply.sqlite');
}

function getHandle(): DatabaseHandle {
  const store = globalThis as unknown as GlobalStore;
  if (!store[GLOBAL_KEY]) {
    const dbPath = resolveDbPath();
    store[GLOBAL_KEY] = openDatabase(dbPath);
  }
  return store[GLOBAL_KEY]!;
}

/** The shared Drizzle DB handle for all server-side code in this Next app. */
export function getDb(): DrizzleDB {
  return getHandle().db;
}

/** Close the DB handle. Used by tests; not called during normal server runtime. */
export function closeDb(): void {
  const store = globalThis as unknown as GlobalStore;
  if (store[GLOBAL_KEY]) {
    store[GLOBAL_KEY]!.close();
    delete store[GLOBAL_KEY];
  }
}
