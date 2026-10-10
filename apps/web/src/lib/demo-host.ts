/**
 * Where the public demo lives: `demo.<domain>` (demo.applyspace.app) serves the
 * fixtures from `lib/demo.ts` with no sign-in. Every other host, previews
 * included, is the real app and requires an account. `APPLY_DEMO=1` turns the
 * demo on for a local run.
 *
 * Pure helper (no Next imports) so the proxy and the server code share it.
 */
export const DEMO_HOST_PREFIX = 'demo.';

/** Whether a request to this `Host` header is a request to the demo. */
export function isDemoHost(host: string | null | undefined): boolean {
  if (process.env.APPLY_DEMO === '1') return true;
  if (!host) return false;
  return host.toLowerCase().startsWith(DEMO_HOST_PREFIX);
}

const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * The public demo is read-only. Server actions already fail closed there (they
 * need a Supabase scope and the demo host never has one), so this is the second
 * lock, at the edge: any API route (`/api/*`) called with a writing method is
 * refused on the demo host. Server actions are left alone on purpose, because
 * the onboarding preview relies on their "signed out" answer.
 */
export function isDemoWriteBlocked(method: string, pathname: string): boolean {
  if (READ_METHODS.has(method.toUpperCase())) return false;
  return pathname === '/api' || pathname.startsWith('/api/');
}
