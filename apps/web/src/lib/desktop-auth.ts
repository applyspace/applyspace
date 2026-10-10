import type { DesktopAuthCallback, DesktopAuthReport } from './desktop';

/** Give up on the code exchange after this long instead of spinning forever. */
export const EXCHANGE_TIMEOUT_MS = 20_000;

export type DesktopAuthStatus = { kind: 'idle' } | { kind: 'working' } | { kind: 'error'; detail: string };

/** The part of `exchangeCodeForSession`'s result we use. */
export interface ExchangeResult {
  error: { name: string; message: string; status?: number } | null;
}

export interface DesktopAuthDeps {
  bridge: {
    takeAuthCallback: () => Promise<DesktopAuthCallback | null>;
    reportAuth?: (report: DesktopAuthReport) => void;
  };
  exchange: (code: string) => Promise<ExchangeResult>;
  setStatus: (status: DesktopAuthStatus) => void;
  onSignedIn: () => void;
  timeoutMs?: number;
}

class ExchangeTimeout extends Error {
  constructor() {
    super('Timed out waiting for Supabase.');
    this.name = 'ExchangeTimeout';
  }
}

/**
 * Finishes a desktop sign-in: takes the one-time code the shell is holding and exchanges it.
 * `consume` is safe to call from any trigger (page mount, shell wake-up, window focus):
 * it does nothing when no callback is waiting or an exchange is already running.
 * Every step is reported to the shell's auth log by name only (never the code), and every
 * failure ends in a visible status instead of a silent hang.
 */
export function createDesktopAuthController(deps: DesktopAuthDeps) {
  const { bridge, exchange, setStatus, onSignedIn, timeoutMs = EXCHANGE_TIMEOUT_MS } = deps;
  const report = (r: DesktopAuthReport) => bridge.reportAuth?.(r);
  let busy = false;

  async function exchangeWithTimeout(code: string): Promise<ExchangeResult> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new ExchangeTimeout()), timeoutMs);
    });
    try {
      return await Promise.race([exchange(code), timeout]);
    } finally {
      clearTimeout(timer);
    }
  }

  async function consume(): Promise<void> {
    if (busy) return;
    // Claim before the first await so two triggers firing together cannot both take.
    busy = true;
    let payload: DesktopAuthCallback | null;
    try {
      payload = await bridge.takeAuthCallback();
    } catch {
      busy = false;
      return;
    }
    if (!payload) {
      busy = false;
      return;
    }

    setStatus({ kind: 'working' });
    if (!('code' in payload)) {
      report({ stage: 'callback-invalid' });
      setStatus({ kind: 'error', detail: 'No sign-in code came back from the browser.' });
      busy = false;
      return;
    }

    report({ stage: 'callback-taken' });
    report({ stage: 'exchange-start' });
    try {
      const result = await exchangeWithTimeout(payload.code);
      if (result.error) {
        report({ stage: 'exchange-error', errorName: result.error.name, status: result.error.status });
        setStatus({ kind: 'error', detail: `${result.error.name}: ${result.error.message}` });
        busy = false;
        return;
      }
      report({ stage: 'exchange-ok' });
      onSignedIn();
    } catch (err) {
      const name = err instanceof Error ? err.name : 'Error';
      report({ stage: name === 'ExchangeTimeout' ? 'exchange-timeout' : 'exchange-error', errorName: name });
      setStatus({ kind: 'error', detail: err instanceof Error ? err.message : 'Unknown error' });
      busy = false;
    }
  }

  return { consume };
}
