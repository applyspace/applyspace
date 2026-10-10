import type { MetadataRoute } from 'next';
import { getResources } from '@/lib/content';
import { hreflang, locales } from '@/lib/i18n';
import { siteUrl } from '@/lib/links';

const STATIC_PATHS = ['/', '/product', '/resources', '/pricing'];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];
  const alternates = (path: string) => ({
    languages: Object.fromEntries(locales.map((l) => [hreflang[l], siteUrl(l, path)])),
  });

  for (const locale of locales) {
    for (const path of STATIC_PATHS) entries.push({ url: siteUrl(locale, path), alternates: alternates(path) });
    for (const r of await getResources(locale)) {
      entries.push({
        url: siteUrl(locale, `/resources/${r.slug}`),
        lastModified: r.updatedAt ?? r.publishedAt,
        alternates: alternates(`/resources/${r.slug}`),
      });
    }
  }
  return entries;
}
