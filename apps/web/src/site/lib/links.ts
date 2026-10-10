import { DESKTOP_DOWNLOAD_URL, SITE_URL } from './env';
import { localePath, type Locale } from './i18n';
import type { Cta } from '@/site/content/types';

/** Absolute URL on the marketing site. */
export function siteUrl(locale: Locale, path: string): string {
  return `${SITE_URL}${localePath(locale, path)}`;
}

/**
 * Link into the app (login, onboarding) with a placement tag for attribution. Relative: the site
 * and the app are the same Next app on the same origin, so previews keep their own login.
 */
export function appHref(path = '/login', placement?: string): string {
  const url = new URL(path, 'https://applyspace.invalid');
  url.searchParams.set('utm_source', 'website');
  if (placement) url.searchParams.set('utm_content', placement);
  return `${url.pathname}${url.search}`;
}

/**
 * Desktop download. Until NEXT_PUBLIC_DESKTOP_DOWNLOAD_URL is set, it opens the sign-in page,
 * which carries the download button of the web app.
 */
export function downloadHref(placement?: string): string {
  if (DESKTOP_DOWNLOAD_URL) return DESKTOP_DOWNLOAD_URL;
  return appHref('/login', placement);
}

/** Resolve a CMS/fallback CTA to a final href. */
export function ctaHref(cta: Cta, locale: Locale, placement?: string): string {
  if (cta.kind === 'app') return appHref(cta.href, placement);
  if (cta.kind === 'download') return downloadHref(placement);
  return localePath(locale, cta.href);
}

/** Internal href that may carry a #anchor. */
export function internalHref(locale: Locale, href: string): string {
  if (/^(https?:|mailto:)/.test(href)) return href;
  const [path, hash] = href.split('#');
  return localePath(locale, path || '/') + (hash ? `#${hash}` : '');
}
