import type { AuthCallbackPayload } from '../shared/ipc.js';
import { createAuthInbox } from './authInbox.js';
import type { AuthLog } from './authLog.js';
import { inspectAuthCallback } from './deepLink.js';

export type LinkSource = 'macos-open-url' | 'second-instance' | 'cold-start';

/** Facts about the window, for the log only. Delivery never depends on them. */
export interface WindowFacts {
  hasWindow: boolean;
  loaded: boolean;
  /**
   * What the old `rendererReady` flag would say (false after any main-frame navigation, in-page
   * ones included; true only after `did-finish-load`). Logged to show when it would have dropped a link.
   */
  legacyReady: boolean;
  /** In-page navigations (history.pushState/replaceState) since the last full load. */
  inPlaceNavs: number;
  msSinceLoad: number | null;
}

export interface CoordinatorDeps {
  /** Push the waiting callback to the renderer. Returns false when there is no live window. */
  send: (payload: AuthCallbackPayload) => boolean;
  focus: () => void;
  log: AuthLog;
  windowFacts: () => WindowFacts;
  setTimer: (fn: () => void, ms: number) => unknown;
  clearTimer: (handle: unknown) => void;
}

export const REDELIVERY_INTERVAL_MS = 2_000;
export const REDELIVERY_ATTEMPTS = 8;

/**
 * Main-process side of the desktop sign-in return (`applyspace://auth/callback`).
 *
 * The callback is kept until the renderer takes it, and the renderer is woken up whenever
 * a link arrives, whatever the window state: a "renderer ready" flag cannot be trusted, because
 * Next.js calls `history.replaceState` on every hydration and Electron reports that as a
 * main-frame navigation without a following `did-finish-load`. While nobody takes the callback
 * the wake-up is repeated for a few seconds.
 */
export function createAuthCoordinator(deps: CoordinatorDeps) {
  const inbox = createAuthInbox();
  let timer: unknown = null;

  function stopRedelivery(): void {
    if (timer !== null) deps.clearTimer(timer);
    timer = null;
  }

  function notify(reason: 'link' | 'retry' | 'loaded'): void {
    const payload = inbox.peek();
    const sent = payload !== null && deps.send(payload);
    deps.log('notify', { reason, sent, hasPending: payload !== null });
  }

  function scheduleRedelivery(attempt: number): void {
    stopRedelivery();
    timer = deps.setTimer(() => {
      timer = null;
      if (!inbox.hasPending()) return;
      if (attempt > REDELIVERY_ATTEMPTS) {
        deps.log('gave-up', { attempts: attempt - 1 });
        return;
      }
      notify('retry');
      scheduleRedelivery(attempt + 1);
    }, REDELIVERY_INTERVAL_MS);
  }

  return {
    handleLink(raw: string, source: LinkSource): void {
      const facts = deps.windowFacts();
      const found = inspectAuthCallback(raw);
      if (found.kind === 'not-ours') {
        deps.log('deep-link-ignored', { source, rawLength: raw.length });
        return;
      }
      const payload: AuthCallbackPayload = found.kind === 'code' ? { code: found.code } : { error: true };
      const outcome = inbox.receive(payload);
      deps.log('deep-link', {
        source,
        parsed: found.kind,
        codeLength: found.kind === 'code' ? found.code.length : found.kind === 'bad-code' ? found.codeLength : null,
        outcome,
        hasWindow: facts.hasWindow,
        windowLoaded: facts.loaded,
        legacyReady: facts.legacyReady,
        inPlaceNavs: facts.inPlaceNavs,
        msSinceLoad: facts.msSinceLoad,
      });
      // A duplicate adds nothing, but if the first copy is still waiting, wake the renderer again.
      if (inbox.hasPending()) {
        notify('link');
        scheduleRedelivery(1);
      }
      deps.focus();
    },

    /** The renderer asks for the waiting callback (page mount, wake-up, window focus). */
    take(): AuthCallbackPayload | null {
      const payload = inbox.take();
      if (payload) {
        stopRedelivery();
        deps.log('taken', { kind: 'code' in payload ? 'code' : 'error' });
      }
      return payload;
    },

    /** A new sign-in starts, or the user signed out: nothing from an earlier attempt may leak in. */
    reset(): void {
      stopRedelivery();
      deps.log('reset', { hadPending: inbox.reset() });
    },

    /** A full page load finished: a callback that arrived meanwhile can be delivered now. */
    onPageLoaded(): void {
      if (inbox.hasPending()) notify('loaded');
    },
  };
}
