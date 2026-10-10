/**
 * Same-origin routing between the app and the public website (`site/`, its own
 * Vercel project) on applyspace.app. Pure function, unit-tested.
 *
 * - Signed-out visitors see the website on `/` and on the marketing pages.
 * - Signed-in users never see the website: `/` is the app Home and marketing
 *   pages redirect to it.
 * - Website assets and SEO files are served to everyone (crawlers, previews of links).
 */

/** Marketing pages: website for signed-out visitors, redirect to `/` for signed-in users. */
const PAGE_PREFIXES = ['/product', '/pricing', '/resources', '/en', '/fr'];
/** Served by the website for everyone. */
const ASSET_PREFIXES = ['/_site', '/og', '/api/revalidate'];
const ASSET_FILES = ['/sitemap.xml', '/robots.txt'];

/** Header added to requests rewritten to the website, so it can tell them from direct visits. */
export const SITE_PROXY_HEADER = 'x-applyspace-site-proxy';

export type SiteRoute = 'site' | 'app' | 'redirect-home';

function matches(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** True for paths the website serves to everyone, whatever the session. */
export function isSiteAsset(pathname: string): boolean {
  return ASSET_FILES.includes(pathname) || matches(pathname, ASSET_PREFIXES);
}

/** Where a request goes once the session is known. */
export function siteRoute(pathname: string, signedIn: boolean): SiteRoute {
  if (isSiteAsset(pathname)) return 'site';
  const isPage = pathname === '/' || matches(pathname, PAGE_PREFIXES);
  if (!isPage) return 'app';
  if (!signedIn) return 'site';
  return pathname === '/' ? 'app' : 'redirect-home';
}
