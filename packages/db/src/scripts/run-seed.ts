import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { openDatabase } from '../client.js';
import { runMigrations } from '../migrate.js';
import { runSeed } from '../seed.js';

/**
 * Dev-only entry point used by `pnpm --filter @apply/db seed`.
 *
 * Opens (or creates) the local dev DB, ensures the schema is up to date, and
 * then runs `runSeed` which is idempotent — safe to invoke repeatedly.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..', '..', '..');
const dbPath = path.join(repoRoot, '.local', 'apply.sqlite');

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const handle = openDatabase(dbPath);
try {
  runMigrations(handle.db);
  const result = runSeed(handle.db);
  console.log(
    `\u2713 Seed complete \u2014 +${result.platformsInserted} platforms, +${result.noGosInserted} no-gos inserted (existing rows preserved).`,
  );
} finally {
  handle.close();
}
