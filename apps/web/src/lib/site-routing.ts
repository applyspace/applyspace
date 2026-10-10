/**
 * Routing between the app and the public website on applyspace.app. Both live in
 * this Next app: the website's pages are built under the internal `/site/<locale>`
 * prefix (`app/(site)`, `*.site.tsx` files, left out of the desktop build) and this
 * module decides, per request, which one a visitor sees. Pure function, unit-tested.
 *
 * - Signed-out visitors see the website on `/` and the marketing pages.
 * - Signed-in users never see the website: `/` is the app Home, marketing pages redirect to it.
 * - The internal `/site/...` URLs and the default-locale prefix (`/en/...`) redirect to the
 *   clean public URL, so search engines index one URL per page.
 */
import { defaultLocale, locales } from '../site/lib/i18n.ts';

/** Internal prefix of the website's pages (folder `app/(site)/site`). */
export const SITE_INTERNAL_PREFIX = '/site';

/** Website pages (without locale prefix). */
const PAGE_PREFIXES = ['/product', '/pricing', '/resources'];
/** Served by the website to everyone, without a session gate. */
const PUBLIC_SITE_FILES = ['/sitemap.xml', '/robots.txt', '/og', '/api/revalidate'];

export type SiteRoute =
  | { kind: 'app' }
  | { kind: 'public' }
  | { kind: 'site'; rewrite: string }
  | { kind: 'redirect'; to: string };

function under(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** `/fr/pricing` -> { locale: 'fr', rest: '/pricing' }; `/pricing` -> default locale. */
function splitLocale(pathname: string): { locale: string; rest: string; prefixed: boolean } {
  const first = pathname.split('/')[1] ?? '';
  if ((locales as readonly string[]).includes(first)) {
    return { locale: first, rest: pathname.slice(first.length + 1) || '/', prefixed: true };
  }
  return { locale: defaultLocale, rest: pathname, prefixed: false };
}

function isSitePage(rest: string): boolean {
  return rest === '/' || PAGE_PREFIXES.some((p) => under(rest, p));
}

function publicPath(locale: string, rest: string): string {
  if (locale === defaultLocale) return rest;
  return rest === '/' ? `/${locale}` : `/${locale}${rest}`;
}

/** Where a request goes once the session is known. `siteEnabled` is false in the desktop build. */
export function siteRoute(pathname: string, signedIn: boolean, siteEnabled = true): SiteRoute {
  if (!siteEnabled) return { kind: 'app' };
  if (PUBLIC_SITE_FILES.some((p) => under(pathname, p))) return { kind: 'public' };

  // Internal URL typed or linked from outside: send to the public URL.
  if (under(pathname, SITE_INTERNAL_PREFIX)) {
    const inner = pathname.slice(SITE_INTERNAL_PREFIX.length) || '/';
    const { locale, rest } = splitLocale(inner);
    return { kind: 'redirect', to: signedIn ? '/' : publicPath(locale, rest) };
  }

  const { locale, rest, prefixed } = splitLocale(pathname);
  if (!isSitePage(rest)) return { kind: 'app' };
  if (signedIn) return pathname === '/' ? { kind: 'app' } : { kind: 'redirect', to: '/' };
  if (prefixed && locale === defaultLocale) return { kind: 'redirect', to: rest };
  return { kind: 'site', rewrite: `${SITE_INTERNAL_PREFIX}/${locale}${rest === '/' ? '' : rest}` };
}
