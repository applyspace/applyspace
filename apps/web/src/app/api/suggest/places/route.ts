import { NextResponse } from 'next/server';

/**
 * Place autocomplete (cities, regions, countries) through Geoapify.
 * The key stays on the server: set GEOAPIFY_API_KEY in the environment (Vercel project settings).
 */
const KINDS = new Set(['city', 'state', 'county', 'country']);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') ?? '').trim().slice(0, 80);
  const lang = (searchParams.get('lang') ?? 'en').slice(0, 2).toLowerCase();
  if (q.length < 2) return NextResponse.json({ suggestions: [] });

  const key = process.env.GEOAPIFY_API_KEY;
  if (!key) return NextResponse.json({ suggestions: [], error: 'GEOAPIFY_API_KEY is not set' }, { status: 503 });

  const url = new URL('https://api.geoapify.com/v1/geocode/autocomplete');
  url.searchParams.set('text', q);
  url.searchParams.set('lang', lang);
  url.searchParams.set('limit', '10');
  url.searchParams.set('format', 'json');
  url.searchParams.set('apiKey', key);

  try {
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return NextResponse.json({ suggestions: [] }, { status: 502 });
    const data = (await res.json()) as { results?: { result_type?: string; formatted?: string }[] };
    const seen = new Set<string>();
    const suggestions: string[] = [];
    for (const r of data.results ?? []) {
      if (!r.formatted || !r.result_type || !KINDS.has(r.result_type) || seen.has(r.formatted)) continue;
      seen.add(r.formatted);
      suggestions.push(r.formatted);
      if (suggestions.length === 6) break;
    }
    return NextResponse.json({ suggestions }, { headers: { 'Cache-Control': 'public, s-maxage=86400' } });
  } catch {
    return NextResponse.json({ suggestions: [] }, { status: 502 });
  }
}
