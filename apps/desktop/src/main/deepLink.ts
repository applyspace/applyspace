import { AUTH_SCHEME, type AuthCallbackPayload } from '../shared/ipc.js';

/** Supabase PKCE codes are short URL-safe strings; reject anything else. */
const CODE_PATTERN = /^[A-Za-z0-9._~-]{8,512}$/;

/** What an `applyspace://` URL turned out to be. Carries the code itself only for `code`. */
export type AuthCallbackInspection =
  | { kind: 'not-ours' }
  | { kind: 'no-code' }
  | { kind: 'bad-code'; codeLength: number }
  | { kind: 'code'; code: string };

/** Classify a URL without ever exposing more than the code length (safe to log). */
export function inspectAuthCallback(raw: string): AuthCallbackInspection {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { kind: 'not-ours' };
  }
  if (url.protocol !== `${AUTH_SCHEME}:` || url.hostname !== 'auth' || url.pathname !== '/callback') {
    return { kind: 'not-ours' };
  }
  const code = url.searchParams.get('code');
  if (!code) return { kind: 'no-code' };
  if (!CODE_PATTERN.test(code)) return { kind: 'bad-code', codeLength: code.length };
  return { kind: 'code', code };
}

/**
 * Validate an `applyspace://auth/callback?...` URL and reduce it to what the
 * renderer may see. Returns null for anything that is not our callback.
 */
export function parseAuthCallback(raw: string): AuthCallbackPayload | null {
  const found = inspectAuthCallback(raw);
  if (found.kind === 'not-ours') return null;
  return found.kind === 'code' ? { code: found.code } : { error: true };
}

/** Find our deep link among process arguments (Windows/Linux `second-instance`, cold start). */
export function findDeepLink(argv: string[]): string | undefined {
  return argv.find((arg) => arg.startsWith(`${AUTH_SCHEME}://`));
}
