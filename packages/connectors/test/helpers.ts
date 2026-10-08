import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

export const NOW = new Date('2026-10-08T12:00:00Z');

export function fixture(name: string): string {
  return readFileSync(join(here, 'fixtures', name), 'utf8');
}

export function fixtureJson(name: string): unknown {
  return JSON.parse(fixture(name));
}
