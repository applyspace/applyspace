import path from 'node:path';

import { defineConfig } from 'drizzle-kit';

/**
 * Drizzle-Kit config.
 *
 * `dbCredentials.url` is only used by `drizzle-kit studio` / `drizzle-kit push`.
 * Production migrations are applied via `src/migrate.ts` (called from the
 * Electron main process), which uses `drizzle-orm/better-sqlite3/migrator`
 * directly.
 *
 * Note: drizzle-kit transpiles this file to CJS at load time, so we rely on
 * `process.cwd()` (always the package dir when invoked via
 * `pnpm --filter @apply/db generate`) instead of `import.meta.url`, which
 * would need an ESM loader drizzle-kit doesn't provide.
 */
export default defineConfig({
  dialect: 'sqlite',
  schema: './src/schema.ts',
  out: './drizzle/migrations',
  dbCredentials: {
    url: path.resolve(process.cwd(), '..', '..', '.local', 'apply.sqlite'),
  },
  strict: true,
  verbose: true,
});
