import { getResources } from '@/site/lib/content';
import { hreflang, locales, type Locale } from '@/site/lib/i18n';
import { siteUrl } from '@/site/lib/links';

/**
 * `/sitemap.xml` of the public website. A route handler (not `sitemap.ts`) so it can use the
 * `.site.ts` extension and stay out of the desktop build (see next.config.ts).
 */
export const revalidate = 3600;

const STATIC_PATHS = ['/', '/product', '/resources', '/pricing'];

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function entry(path: string, locale: Locale, lastModified?: string): string {
  const alternates = locales
    .map((l) => `<xhtml:link rel="alternate" hreflang="${hreflang[l]}" href="${esc(siteUrl(l, path))}"/>`)
    .join('');
  const lastmod = lastModified ? `<lastmod>${esc(new Date(lastModified).toISOString())}</lastmod>` : '';
  return `<url><loc>${esc(siteUrl(locale, path))}</loc>${lastmod}${alternates}</url>`;
}

export async function GET(): Promise<Response> {
  const urls: string[] = [];
  for (const locale of locales) {
    for (const path of STATIC_PATHS) urls.push(entry(path, locale));
    for (const r of await getResources(locale)) {
      urls.push(entry(`/resources/${r.slug}`, locale, r.updatedAt ?? r.publishedAt));
    }
  }
  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">' +
    urls.join('') +
    '</urlset>';
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
