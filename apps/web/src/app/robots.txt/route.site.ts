import { SITE_URL, isIndexable } from '@/site/lib/env';

/**
 * `/robots.txt`: production may be crawled (website pages only); previews, staging and local runs
 * disallow everything. A route handler so it stays out of the desktop build (see next.config.ts).
 */
export function GET(): Response {
  const body = isIndexable
    ? ['User-agent: *', 'Allow: /', 'Disallow: /api/', 'Disallow: /og', 'Disallow: /site/', '', `Host: ${SITE_URL}`, `Sitemap: ${SITE_URL}/sitemap.xml`, ''].join('\n')
    : ['User-agent: *', 'Disallow: /', ''].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
