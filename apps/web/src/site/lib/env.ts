/**
 * Every environment variable the site reads, in one place. Names are documented in `apps/web/.env.example`.
 * Nothing here throws when a variable is missing: the site falls back to local content.
 */
const trimSlash = (s: string) => s.replace(/\/+$/, '');

export const SITE_URL = trimSlash(process.env.NEXT_PUBLIC_SITE_URL || 'https://applyspace.app');

export const SANITY_PROJECT_ID = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '';
export const SANITY_DATASET = process.env.NEXT_PUBLIC_SANITY_DATASET || '';
export const SANITY_API_VERSION = process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2026-10-01';
export const SANITY_READ_TOKEN = process.env.SANITY_API_READ_TOKEN || '';
export const SANITY_REVALIDATE_SECRET = process.env.SANITY_REVALIDATE_SECRET || '';

/** Public macOS download (a .dmg or a release page). Empty until the desktop download is published. */
export const DESKTOP_DOWNLOAD_URL = process.env.NEXT_PUBLIC_DESKTOP_DOWNLOAD_URL || '';

export const isSanityConfigured = Boolean(SANITY_PROJECT_ID && SANITY_DATASET);

/** Only the production deployment on Vercel may be indexed. Previews, staging and local runs are noindex. */
export const isIndexable = process.env.VERCEL_ENV === 'production';
