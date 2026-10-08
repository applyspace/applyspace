import { NextResponse } from 'next/server';

/**
 * Job title and skill autocomplete from ESCO, the European classification of occupations and skills
 * (free, no key, multilingual). `kind=occupation` (default) for job titles, `kind=skill` for skills.
 */
const KINDS = new Set(['occupation', 'skill']);
const LANGS = new Set(['bg', 'cs', 'da', 'de', 'el', 'en', 'es', 'et', 'fi', 'fr', 'ga', 'hr', 'hu', 'is', 'it', 'lt', 'lv', 'mt', 'nl', 'no', 'pl', 'pt', 'ro', 'sk', 'sl', 'sv']);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') ?? '').trim().slice(0, 80);
  const kind = KINDS.has(searchParams.get('kind') ?? '') ? (searchParams.get('kind') as string) : 'occupation';
  const requested = (searchParams.get('lang') ?? 'en').slice(0, 2).toLowerCase();
  const lang = LANGS.has(requested) ? requested : 'en';
  if (q.length < 2) return NextResponse.json({ suggestions: [] });

  const url = new URL('https://ec.europa.eu/esco/api/suggest2');
  url.searchParams.set('text', q);
  url.searchParams.set('type', kind);
  url.searchParams.set('language', lang);
  url.searchParams.set('limit', '8');

  try {
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return NextResponse.json({ suggestions: [] }, { status: 502 });
    const data = (await res.json()) as { _embedded?: { results?: { title?: string }[] } };
    const seen = new Set<string>();
    const suggestions: string[] = [];
    for (const r of data._embedded?.results ?? []) {
      const title = r.title?.trim();
      if (!title || seen.has(title.toLowerCase())) continue;
      seen.add(title.toLowerCase());
      suggestions.push(title);
    }
    return NextResponse.json({ suggestions }, { headers: { 'Cache-Control': 'public, s-maxage=86400' } });
  } catch {
    return NextResponse.json({ suggestions: [] }, { status: 502 });
  }
}
