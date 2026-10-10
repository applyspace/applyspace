'use client';

import { useEffect, useState } from 'react';
import { useLocale } from '@/components/providers/Providers';
import { getDesktopBridge } from '@/lib/desktop';
import { createDesktopAuthController, type DesktopAuthStatus } from '@/lib/desktop-auth';
import { createClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/env';

/**
 * Desktop only: finishes the Google/LinkedIn sign-in that was started in the
 * system browser. The shell hands over the one-time code from
 * `applyspace://auth/callback`; we exchange it here, where the PKCE verifier
 * cookie was created, then reload so server components see the session.
 *
 * The shell's push is only a wake-up call and can be missed, so the callback is also
 * looked for on mount, on window focus (the shell focuses the window when the link
 * arrives) and when the page becomes visible again. On failure it shows what went wrong
 * (Supabase's error text, never a code or token) instead of a blank spinner.
 * Renders nothing in a regular browser.
 */
export function DesktopAuthBridge() {
  const { t } = useLocale();
  const [status, setStatus] = useState<DesktopAuthStatus>({ kind: 'idle' });

  useEffect(() => {
    const bridge = getDesktopBridge();
    if (!bridge || !isSupabaseConfigured) return;

    const controller = createDesktopAuthController({
      bridge,
      exchange: (code) => createClient().auth.exchangeCodeForSession(code),
      setStatus,
      onSignedIn: () => window.location.assign('/'),
    });
    const run = () => void controller.consume();
    const onVisible = () => {
      if (document.visibilityState === 'visible') run();
    };

    run();
    const off = bridge.onAuthCallback(run);
    window.addEventListener('focus', run);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      off();
      window.removeEventListener('focus', run);
      document.removeEventListener('visibilitychange', onVisible);
    };
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
