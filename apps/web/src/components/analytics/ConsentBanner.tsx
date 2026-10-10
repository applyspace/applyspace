'use client';

import { useSyncExternalStore } from 'react';
import { useAuth, useLocale } from '@/components/providers/Providers';
import { Button } from '@/components/ui/button';
import { analytics } from '@/lib/analytics';

/**
 * One-time, non-blocking analytics consent prompt for signed-in users.
 * Floats in the bottom corner (full width minus gutters on small screens), so it
 * never shifts the onboarding layout, its top bar or the app shell. It stays
 * until the user picks Accept or Decline; posthog-js remembers the choice.
 */
export function ConsentBanner() {
  const { user } = useAuth();
  const { t } = useLocale();
  const status = useSyncExternalStore(
    analytics.subscribeConsent,
    analytics.consentStatus,
    () => 'granted' as const, // server render and hydration: hidden, no flash
  );

  if (!user || status !== 'pending') return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label={t.consent.title}
      className="fixed inset-x-4 bottom-4 z-[60] flex flex-col gap-3 rounded-2xl border border-border bg-background p-4 shadow-lg sm:inset-x-auto sm:right-4 sm:w-96"
    >
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-foreground">{t.consent.title}</p>
        <p className="text-sm leading-relaxed text-muted-foreground">{t.consent.body}</p>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => analytics.setConsent(false)}>
          {t.consent.decline}
        </Button>
        <Button size="sm" onClick={() => analytics.setConsent(true)}>
          {t.consent.accept}
        </Button>
      </div>
    </div>
  );
}
