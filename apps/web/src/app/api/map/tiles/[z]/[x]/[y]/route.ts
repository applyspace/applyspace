import { NextResponse } from 'next/server';
import { getSupabaseScope } from '@/lib/supabase/scope';

/**
 * Map tiles for the Applications map, fetched from Geoapify on the server so
 * the key never reaches the browser. Signed-in users only.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ z: string; x: string; y: string }> },
) {
  if (!(await getSupabaseScope())) return new NextResponse(null, { status: 401 });

  const { z, x, y } = await params;
  const zoom = Number(z);
  const tx = Number(x);
  const ty = Number(y);
  const max = 2 ** zoom;
  if (![zoom, tx, ty].every(Number.isInteger) || zoom < 0 || zoom > 18 || tx < 0 || ty < 0 || tx >= max || ty >= max) {
    return new NextResponse(null, { status: 400 });
  }

  const key = process.env.GEOAPIFY_API_KEY;
  if (!key) return new NextResponse(null, { status: 503 });

  try {
    const res = await fetch(`https://maps.geoapify.com/v1/tile/osm-bright/${zoom}/${tx}/${ty}.png?apiKey=${key}`, {
      next: { revalidate: 604800 },
    });
    if (!res.ok) return new NextResponse(null, { status: 502 });
    return new NextResponse(await res.arrayBuffer(), {
      headers: { 'Content-Type': 'image/png', 'Cache-Control': 'private, max-age=604800' },
    });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}
