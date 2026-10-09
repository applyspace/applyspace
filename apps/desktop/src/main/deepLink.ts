import { AUTH_SCHEME, type AuthCallbackPayload } from '../shared/ipc.js';

/** Supabase PKCE codes are short URL-safe strings; reject anything else. */
const CODE_PATTERN = /^[A-Za-z0-9._~-]{8,512}$/;

/**
 * Validate an `applyspace://auth/callback?...` URL and reduce it to what the
 * renderer may see. Returns null for anything that is not our callback.
 */
export function parseAuthCallback(raw: string): AuthCallbackPayload | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== `${AUTH_SCHEME}:` || url.hostname !== 'auth' || url.pathname !== '/callback') {
    return null;
  }
  const code = url.searchParams.get('code');
  if (code && CODE_PATTERN.test(code)) return { code };
  return { error: true };
}

/** Find our deep link among process arguments (Windows/Linux `second-instance`, cold start). */
export function findDeepLink(argv: string[]): string | undefined {
  return argv.find((arg) => arg.startsWith(`${AUTH_SCHEME}://`));
}
