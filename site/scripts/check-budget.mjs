// Performance budget: gzip size of the JavaScript each prerendered page loads (nomodule polyfills excluded: modern browsers skip them).
// Run after `pnpm build`: `pnpm budget`. Fails when a page exceeds BUDGET_KB (default 170: Next + React baseline is about 155 kB gzip).
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

const BUDGET_KB = Number(process.env.BUDGET_KB || 170);
const root = '.next/server/app';
const pages = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (name.endsWith('.html')) pages.push(p);
  }
})(root);

let failed = false;
for (const page of pages) {
  const html = readFileSync(page, 'utf8');
  const srcs = [...new Set([...html.matchAll(/<script(?![^>]*noModule)[^>]+src="(\/_next\/static\/[^"]+\.js)[^"]*"/g)].map((m) => m[1]))];
  let bytes = 0;
  for (const src of srcs) {
    try { bytes += gzipSync(readFileSync(join('.next', src.replace('/_next/', '')))).length; } catch {}
  }
  const kb = bytes / 1024;
  const ok = kb <= BUDGET_KB;
  failed ||= !ok;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${page.replace(root, '')} ${kb.toFixed(1)} kB gzip JS (${srcs.length} files, budget ${BUDGET_KB})`);
}
process.exit(failed ? 1 : 0);
