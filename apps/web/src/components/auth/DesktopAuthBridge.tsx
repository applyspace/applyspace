'use client';

import { useEffect } from 'react';
import { getDesktopBridge } from '@/lib/desktop';
import { createClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/env';

/**
 * Desktop only: finishes the Google/LinkedIn sign-in that was started in the
 * system browser. The shell hands over the one-time code from
 * `applyspace://auth/callback`; we exchange it here, where the PKCE verifier
 * cookie was created, then reload so server components see the session.
 * Renders nothing in a regular browser.
 */
export function DesktopAuthBridge() {
  useEffect(() => {
    const bridge = getDesktopBridge();
    if (!bridge || !isSupabaseConfigured) return;

    let busy = false;
    async function consume() {
      if (!bridge || busy) return;
      const payload = await bridge.takeAuthCallback();
      if (!payload) return;
      busy = true;
      if ('code' in payload) {
        const { error } = await createClient().auth.exchangeCodeForSession(payload.code);
        window.location.assign(error ? '/login?error=auth' : '/');
      } else {
        window.location.assign('/login?error=auth');
      }
    }

    void consume();
    const off = bridge.onAuthCallback(() => void consume());
    return off;
  }, []);

  return null;
}
