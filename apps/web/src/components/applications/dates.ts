import type { Locale } from '@/lib/i18n';

const intlLocale = (locale: Locale) => (locale === 'fr' ? 'fr-FR' : 'en-GB');

/** Day and short month ("12 Oct"). UTC so server and client render the same text. */
export function formatDay(iso: string, locale: Locale): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(t);
}

/** Day, month and time in the viewer's time zone, for client-only surfaces (the peek). */
export function formatDayTime(iso: string, locale: Locale): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  const withTime = iso.includes('T');
  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: 'numeric',
    month: 'short',
    hour: withTime ? '2-digit' : undefined,
    minute: withTime ? '2-digit' : undefined,
  }).format(t);
}
