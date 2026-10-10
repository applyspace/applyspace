import { NextResponse } from 'next/server';
import { getSupabaseScope } from '@/lib/supabase/scope';

/**
 * Coordinates of a place name (city, region, country) through Geoapify, for the
 * Applications map. Signed-in users only, so the quota is not an open proxy.
 * The key stays on the server: set GEOAPIFY_API_KEY in the environment (Vercel project settings).
 */
export async function GET(request: Request) {
  if (!(await getSupabaseScope())) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') ?? '').trim().slice(0, 120);
  if (q.length < 2) return NextResponse.json({ error: 'Missing place' }, { status: 400 });

  const key = process.env.GEOAPIFY_API_KEY;
  if (!key) return NextResponse.json({ error: 'GEOAPIFY_API_KEY is not set' }, { status: 503 });

  const url = new URL('https://api.geoapify.com/v1/geocode/search');
  url.searchParams.set('text', q);
  url.searchParams.set('limit', '1');
  url.searchParams.set('format', 'json');
  url.searchParams.set('apiKey', key);

  try {
    const res = await fetch(url, { next: { revalidate: 604800 } });
    if (!res.ok) return NextResponse.json({ error: 'Geocoding failed' }, { status: 502 });
    const data = (await res.json()) as { results?: { lat?: number; lon?: number }[] };
    const hit = data.results?.[0];
    if (typeof hit?.lat !== 'number' || typeof hit.lon !== 'number') {
      return NextResponse.json({ lat: null, lon: null });
    }
    return NextResponse.json(
      { lat: hit.lat, lon: hit.lon },
      { headers: { 'Cache-Control': 'private, max-age=604800' } },
    );
  } catch {
    return NextResponse.json({ error: 'Geocoding failed' }, { status: 502 });
  }
}
