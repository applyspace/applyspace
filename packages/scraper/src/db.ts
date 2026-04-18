import fs from 'node:fs';
import path from 'node:path';
import { openDatabase, runMigrations, type DatabaseHandle } from '@apply/db';

/**
 * Resolve the SQLite DB path.
 *
 * Priority:
 *   1. `APPLY_DB_PATH` env var (set by Electron / CI / tests)
 *   2. Walk up from `cwd()` looking for `.local/apply.sqlite`
 *   3. Fallback to `<repoRoot>/.local/apply.sqlite` (two levels up from this package)
 */
export function resolveDbPath(): string {
  const envPath = process.env.APPLY_DB_PATH;
  if (envPath) return envPath;

  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    const candidate = path.join(dir, '.local', 'apply.sqlite');
    if (fs.existsSync(candidate)) return candidate;
    if (fs.existsSync(path.join(dir, '.local'))) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return path.resolve(process.cwd(), '..', '..', '.local', 'apply.sqlite');
}

/**
 * Open the scraper's DB handle. Ensures migrations are applied — a fresh
 * `.local/apply.sqlite` (first run on a new machine) will get the full schema
 * before any insert is attempted.
 */
export function openScraperDb(): DatabaseHandle {
  const dbPath = resolveDbPath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const handle = openDatabase(dbPath);
  runMigrations(handle.db);
  return handle;
}
