import { NextResponse } from 'next/server';

/**
 * Place autocomplete (cities, regions, countries) through Geoapify.
 * The key stays on the server: set GEOAPIFY_API_KEY in the environment (Vercel project settings).
 */
const KINDS = new Set(['city', 'state', 'county', 'country']);

type Place = { result_type?: string; formatted?: string; city?: string; county?: string; state?: string; country?: string; name?: string };

/** Full names only ("Paris, Île-de-France, France"), never the codes Geoapify puts in `formatted` ("Paris, IDF, France"). */
function label(r: Place): string | undefined {
  const head = r.result_type === 'country' ? r.country : r.result_type === 'state' ? r.state : r.result_type === 'county' ? r.county : (r.city ?? r.name);
  const parts = [head, r.result_type === 'country' ? undefined : r.state, r.result_type === 'country' ? undefined : r.country].filter((x): x is string => !!x);
  return [...new Set(parts)].join(', ') || undefined;
}

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
    const data = (await res.json()) as { results?: Place[] };
    const seen = new Set<string>();
    const suggestions: string[] = [];
    for (const r of data.results ?? []) {
      const name = label(r);
      if (!name || !r.result_type || !KINDS.has(r.result_type) || seen.has(name)) continue;
      seen.add(name);
      suggestions.push(name);
      if (suggestions.length === 6) break;
    }
    return NextResponse.json({ suggestions }, { headers: { 'Cache-Control': 'public, s-maxage=86400' } });
  } catch {
    return NextResponse.json({ suggestions: [] }, { status: 502 });
  }
}
