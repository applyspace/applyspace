import type { MetadataRoute } from 'next';
import { SITE_URL, isIndexable } from '@/lib/env';

/** Production may be crawled; previews, staging and local runs disallow everything. */
export default function robots(): MetadataRoute.Robots {
  if (!isIndexable) return { rules: { userAgent: '*', disallow: '/' } };
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/api/', '/og'] },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
