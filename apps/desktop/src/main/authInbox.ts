import type { AuthCallbackPayload } from '../shared/ipc.js';

/** How many already-seen codes we remember. A code is single-use, so a repeat is never useful. */
const SEEN_LIMIT = 16;

export type ReceiveOutcome = 'stored' | 'duplicate';

/**
 * Holds the one deep-link callback waiting for the renderer.
 *
 * - `receive` keeps it until `take` (a push to the renderer is only a wake-up call).
 * - A code that was already received is dropped: the bridge page can open the app twice
 *   (automatic attempt + button click), and a stale second copy would otherwise be taken
 *   later by a fresh page and fail with a missing PKCE verifier.
 * - `reset` forgets a waiting callback when a new sign-in starts; seen codes stay remembered.
 */
export interface AuthInbox {
  receive(payload: AuthCallbackPayload): ReceiveOutcome;
  peek(): AuthCallbackPayload | null;
  take(): AuthCallbackPayload | null;
  hasPending(): boolean;
  /** Returns whether a callback was waiting. */
  reset(): boolean;
}

export function createAuthInbox(): AuthInbox {
  let pending: AuthCallbackPayload | null = null;
  const seen: string[] = [];

  return {
    receive(payload) {
      if ('code' in payload) {
        if (seen.includes(payload.code)) return 'duplicate';
        seen.push(payload.code);
        if (seen.length > SEEN_LIMIT) seen.shift();
      }
      pending = payload;
      return 'stored';
    },
    peek: () => pending,
    take() {
      const payload = pending;
      pending = null;
      return payload;
    },
    hasPending: () => pending !== null,
    reset() {
      const had = pending !== null;
      pending = null;
      return had;
    },
  };
}
