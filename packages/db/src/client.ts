import Database, { type Database as SqliteDatabase } from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';

import * as schema from './schema.js';

/**
 * The fully-typed Drizzle database handle, with the relational schema attached.
 *
 * Using `typeof schema` here means `db.query.*` is typed for every table we
 * declare in `schema.ts` (with `with: {...}` autocompletion for relations).
 */
export type DrizzleDB = BetterSQLite3Database<typeof schema>;

export interface DatabaseHandle {
  /** The Drizzle ORM handle — use this for all CRUD. */
  db: DrizzleDB;
  /** The underlying better-sqlite3 connection — exposed for raw pragmas/backup. */
  raw: SqliteDatabase;
  /** Close the underlying connection. Call from app shutdown hooks. */
  close: () => void;
}

/**
 * Open (or create) a SQLite database at `dbPath`.
 *
 * This is the single entry point used by:
 *   - the Electron main process (prod → `userData/apply.sqlite`)
 *   - the dev `db:migrate` / `db:seed` / `db:migrate-legacy` CLI scripts
 *     (dev → `.local/apply.sqlite`)
 *   - the Next.js server runtime (shares the same file as Electron in prod)
 *
 * Pragmas applied:
 *   - `journal_mode = WAL`    → durable, allows concurrent readers
 *   - `foreign_keys = ON`     → SQLite's default is OFF (!); we need this for
 *                              `ON DELETE CASCADE` / `RESTRICT` to actually fire
 *   - `synchronous = NORMAL`  → safe with WAL, much faster than FULL
 */
export function openDatabase(dbPath: string): DatabaseHandle {
  const raw = new Database(dbPath);
  raw.pragma('journal_mode = WAL');
  raw.pragma('foreign_keys = ON');
  raw.pragma('synchronous = NORMAL');

  const db = drizzle(raw, { schema });

  return {
    db,
    raw,
    close: () => raw.close(),
  };
}
