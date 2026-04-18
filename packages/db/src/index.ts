/**
 * `@apply/db` — public entry point.
 *
 * Consumers (Electron main, Next.js server, scraper, scripts) should import
 * from this barrel unless they specifically need a subpath export (e.g.
 * `@apply/db/schema` for type-only imports to avoid dragging better-sqlite3
 * into the renderer bundle).
 */

export * from './schema.js';
export * from './client.js';
export * from './migrate.js';
export * from './seed.js';
