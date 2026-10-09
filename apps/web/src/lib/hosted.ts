import { cache } from 'react';
import { headers } from 'next/headers';
import { isDemoHost } from '@/lib/demo-host';

/**
 * Whether the current request is for the public demo (`demo.applyspace.app`,
 * or any host when `APPLY_DEMO=1`). The demo serves the fixtures from
 * `lib/demo.ts`, never reads a session and never touches user data; the main
 * domain and previews are the real app. Decided per request, from the host.
 */
export const isDemoRequest = cache(async (): Promise<boolean> => {
  if (process.env.APPLY_DEMO === '1') return true;
  try {
    const h = await headers();
    return isDemoHost(h.get('x-forwarded-host') ?? h.get('host'));
  } catch {
    // Outside a request (build time): not the demo.
    return false;
  }
});
