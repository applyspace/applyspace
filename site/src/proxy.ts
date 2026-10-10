import { NextResponse, type NextRequest } from 'next/server';
import { defaultLocale, isLocale } from '@/lib/i18n';

/**
 * Locale routing without a prefix for the default locale:
 * `/pricing` is served by `app/[locale]/pricing` with locale `en` (rewrite), and `/en/pricing` redirects to `/pricing`
 * so each page has a single URL. Other locales keep their prefix (`/fr/pricing`).
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
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
