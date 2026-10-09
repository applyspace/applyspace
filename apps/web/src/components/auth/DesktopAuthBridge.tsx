'use client';

import { useEffect, useState } from 'react';
import { useLocale } from '@/components/providers/Providers';
import { getDesktopBridge } from '@/lib/desktop';
import { createClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/env';

/** Give up on the code exchange after this long instead of spinning forever. */
const EXCHANGE_TIMEOUT_MS = 20_000;

type Status = { kind: 'idle' } | { kind: 'working' } | { kind: 'error'; detail: string };

/**
 * Desktop only: finishes the Google/LinkedIn sign-in that was started in the
 * system browser. The shell hands over the one-time code from
 * `applyspace://auth/callback`; we exchange it here, where the PKCE verifier
 * cookie was created, then reload so server components see the session.
 * While it runs it shows a status screen, and on failure it shows what went
 * wrong (Supabase's error text, never a code or token) instead of a blank spinner.
 * Renders nothing in a regular browser.
 */
export function DesktopAuthBridge() {
  const { t } = useLocale();
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  useEffect(() => {
    const bridge = getDesktopBridge();
    if (!bridge || !isSupabaseConfigured) return;

    let busy = false;
    async function consume() {
      if (!bridge || busy) return;
      const payload = await bridge.takeAuthCallback();
      if (!payload) return;
      busy = true;
      setStatus({ kind: 'working' });
      if (!('code' in payload)) {
        setStatus({ kind: 'error', detail: 'No sign-in code came back from the browser.' });
        return;
      }
      try {
        const result = await Promise.race([
          createClient().auth.exchangeCodeForSession(payload.code),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Timed out waiting for Supabase.')), EXCHANGE_TIMEOUT_MS),
          ),
        ]);
        if (result.error) {
          setStatus({ kind: 'error', detail: `${result.error.name}: ${result.error.message}` });
          busy = false;
          return;
        }
        window.location.assign('/');
      } catch (err) {
        setStatus({ kind: 'error', detail: err instanceof Error ? err.message : 'Unknown error' });
        busy = false;
      }
    }

    void consume();
    const off = bridge.onAuthCallback(() => void consume());
    return off;
  }, []);

  if (status.kind === 'idle') return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-white px-6 text-center text-stone-950">
      {status.kind === 'working' ? (
        <p className="text-sm text-stone-600">{t.auth.desktopSigningIn}</p>
      ) : (
        <>
          <p className="text-base font-medium">{t.auth.desktopSignInFailed}</p>
          <p className="max-w-md break-words text-xs text-stone-500">{status.detail}</p>
          <a
            href="/login"
            className="inline-flex h-10 items-center rounded-full bg-stone-950 px-5 text-sm font-medium text-white hover:bg-stone-800"
          >
            {t.auth.desktopBackToLogin}
          </a>
        </>
      )}
    </div>
  );
}
