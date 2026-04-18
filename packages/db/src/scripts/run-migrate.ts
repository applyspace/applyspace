import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { openDatabase } from '../client.js';
import { runMigrations } from '../migrate.js';

/**
 * Dev-only entry point used by `pnpm --filter @apply/db migrate`.
 *
 * Targets `<repo-root>/.local/apply.sqlite` — the same file drizzle-kit studio
 * opens — so contributors can iterate on the schema without spinning up
 * Electron. In production the Electron main process calls `runMigrations`
 * directly against `app.getPath('userData') + '/apply.sqlite'`.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// packages/db/src/scripts/run-migrate.ts -> <repo>/packages/db → 4 levels up
const repoRoot = path.resolve(__dirname, '..', '..', '..', '..');
const dbPath = path.join(repoRoot, '.local', 'apply.sqlite');

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const handle = openDatabase(dbPath);
try {
  runMigrations(handle.db);
  console.log(`\u2713 Migrations applied to ${dbPath}`);
} finally {
  handle.close();
}
