import { revalidateTag } from 'next/cache';
import { SANITY_REVALIDATE_SECRET } from '@/site/lib/env';
import { SANITY_TAG } from '@/site/lib/sanity';

/**
 * Sanity webhook target: POST with header `x-revalidate-secret` equal to SANITY_REVALIDATE_SECRET.
 * Drops the cached Sanity fetches so published changes show without a redeploy.
 */
export async function POST(request: Request) {
  if (!SANITY_REVALIDATE_SECRET || request.headers.get('x-revalidate-secret') !== SANITY_REVALIDATE_SECRET) {
    return Response.json({ ok: false }, { status: 401 });
  }
  revalidateTag(SANITY_TAG, 'max');
  return Response.json({ ok: true });
}
