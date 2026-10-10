import { APP_URL, SITE_URL } from './env';
import { localePath, type Locale } from './i18n';
import type { Cta } from '@/content/types';

/** Absolute URL on the marketing site. */
export function siteUrl(locale: Locale, path: string): string {
  return `${SITE_URL}${localePath(locale, path)}`;
}

/** Link into the app (login, onboarding) with a placement tag for attribution. */
export function appHref(path = '/login', placement?: string): string {
  const url = new URL(path, APP_URL);
  url.searchParams.set('utm_source', 'website');
  if (placement) url.searchParams.set('utm_content', placement);
  return url.toString();
}

/** Resolve a CMS/fallback CTA to a final href. */
export function ctaHref(cta: Cta, locale: Locale, placement?: string): string {
  if (cta.kind === 'app') return appHref(cta.href, placement);
  return localePath(locale, cta.href);
}

/** Internal href that may carry a #anchor. */
export function internalHref(locale: Locale, href: string): string {
  if (/^https?:\/\//.test(href)) return href;
  const [path, hash] = href.split('#');
  return localePath(locale, path || '/') + (hash ? `#${hash}` : '');
}
