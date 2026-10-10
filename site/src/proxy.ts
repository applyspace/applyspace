import { NextResponse, type NextRequest } from 'next/server';
import { defaultLocale, isLocale } from '@/lib/i18n';
import { SITE_URL, isIndexable } from '@/lib/env';

/** Set by the app's proxy on requests it rewrites here (see apps/web/src/lib/site-routing.ts). */
const SITE_PROXY_HEADER = 'x-applyspace-site-proxy';
const CANONICAL_HOST = new URL(SITE_URL).host;

/**
 * Locale routing without a prefix for the default locale:
 * `/pricing` is served by `app/[locale]/pricing` with locale `en` (rewrite), and `/en/pricing` redirects to `/pricing`
 * so each page has a single URL. Other locales keep their prefix (`/fr/pricing`).
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // In production the website is only reachable through applyspace.app: a direct visit on the
  // site's own domain (e.g. site.applyspace.app) redirects there, so search engines see one URL.
  const viaApp = request.headers.get(SITE_PROXY_HEADER) === '1';
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? '';
  if (isIndexable && !viaApp && host !== CANONICAL_HOST) {
    return NextResponse.redirect(new URL(`${pathname}${search}`, SITE_URL), 308);
  }
  const first = pathname.split('/')[1] ?? '';

  if (isLocale(first)) {
    if (first === defaultLocale) {
      const url = request.nextUrl.clone();
      url.pathname = pathname.slice(first.length + 1) || '/';
      return NextResponse.redirect(url, 308);
    }
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = `/${defaultLocale}${pathname === '/' ? '' : pathname}`;
  url.search = search;
  return NextResponse.rewrite(url);
}

export const config = {
  // Skip Next internals, route handlers and files with an extension (sitemap.xml, robots.txt, images).
  matcher: ['/((?!_next|api|og|.*\\..*).*)'],
};
