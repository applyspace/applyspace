/**
 * Writes the reviewable SQL form of the demo seed.
 *
 *   pnpm demo:sql [--anchor YYYY-MM-DD] [--email demo@example.com] [--out path]
 *
 * Default output: supabase/seed/demo-account.sql. Makes no network call.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_ANCHOR, DEFAULT_DEMO_EMAIL, generateSeedSql } from '@apply/core/demo';

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const out = resolve(arg('out') ?? `${root}/supabase/seed/demo-account.sql`);
const sql = generateSeedSql({ anchor: arg('anchor') ?? DEFAULT_ANCHOR, email: arg('email') ?? DEFAULT_DEMO_EMAIL });
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, sql);
console.log(`Wrote ${out} (${sql.length} bytes)`);
