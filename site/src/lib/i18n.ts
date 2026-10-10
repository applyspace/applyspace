/** i18n-ready routing. English only for now; URLs of the default locale carry no prefix. */
export const locales = ['en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

/** Path for a locale: `/pricing` in English, `/fr/pricing` once French exists. */
export function localePath(locale: Locale, path: string): string {
  const clean = path === '/' ? '' : path.startsWith('/') ? path : `/${path}`;
  if (locale === defaultLocale) return clean || '/';
  return `/${locale}${clean}`;
}

/** BCP 47 / hreflang tag per locale. */
export const hreflang: Record<Locale, string> = { en: 'en' };
