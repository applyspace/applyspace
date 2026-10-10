'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useLocalStorageItem } from '@/lib/useLocalStorage';
import type { Locale, T } from '@/lib/i18n';
import { translations } from '@/lib/i18n';
import { toAuthUser, type AuthUser } from '@/lib/auth-user';
import { getDesktopBridge } from '@/lib/desktop';
import { createClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { analytics } from '@/lib/analytics';
import { isDemoEmail } from '@apply/core/demo-identity';
import { ConsentBanner } from '@/components/analytics/ConsentBanner';

// ── Locale context ────────────────────────────────────────────────────────────────────────

interface LocaleContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: T;
}

const DEFAULT_LOCALE: Locale = 'en';

const LocaleContext = createContext<LocaleContextValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  t: translations[DEFAULT_LOCALE] as unknown as T,
});

export function useLocale() {
  return useContext(LocaleContext);
}

function LocaleProvider({
  children,
  initialLocale,
}: {
  children: React.ReactNode;
  initialLocale: Locale;
}) {
  const [savedLocale, saveLocale] = useLocalStorageItem('apply-locale');
  const locale: Locale = savedLocale === 'en' || savedLocale === 'fr' ? savedLocale : initialLocale;

  function setLocale(l: Locale) {
    saveLocale(l);
    document.documentElement.lang = l;
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t: translations[locale] as unknown as T }}>
      {children}
    </LocaleContext.Provider>
  );
}

// ── Auth context ──────────────────────────────────────────────────────────────────────────

interface AuthContextValue {
  user: AuthUser | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

function AuthProvider({
  initialUser,
  children,
}: {
  initialUser: AuthUser | null;
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<AuthUser | null>(initialUser);
  const userIdRef = useRef(initialUser?.id ?? null);
  const didResetForSignOutRef = useRef(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const { data } = createClient().auth.onAuthStateChange((event, session) => {
      const nextUser = session?.user ? toAuthUser(session.user) : null;

      if (event === 'SIGNED_OUT') {
        if (didResetForSignOutRef.current) didResetForSignOutRef.current = false;
        else analytics.reset();
      } else if (nextUser && userIdRef.current && userIdRef.current !== nextUser.id) {
        // A direct account switch must not merge the previous account's activity.
        analytics.reset();
      }

      userIdRef.current = nextUser?.id ?? null;
      setUser((currentUser) => (currentUser?.id === nextUser?.id ? currentUser : nextUser));
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    analytics.capture('sign_out_completed');
    didResetForSignOutRef.current = true;
    analytics.reset();
    // Desktop: sign out this device only. The default (global) scope would also revoke the
    // sessions of the web app and every other device. The shell forgets any callback still waiting.
    const desktop = getDesktopBridge();
    await desktop?.resetAuth?.();
    if (isSupabaseConfigured) await createClient().auth.signOut({ scope: desktop ? 'local' : 'global' });
    window.location.assign('/login');
  }, []);

  return <AuthContext.Provider value={{ user, signOut }}>{children}</AuthContext.Provider>;
}

// ── Demo sessions send no analytics ───────────────────────────────────────────────────────

const AnalyticsBlockedContext = createContext(false);

/** True in a demo session (public demo host, or the demo account): no analytics, no consent prompt. */
export function useAnalyticsBlocked() {
  return useContext(AnalyticsBlockedContext);
}

/**
 * Blocks analytics for the public demo host and for the demo account (an
 * `example.com` address, see docs/demo-account.md), so demo activity is never
 * recorded as a real user's. Lifts the block when the visitor signs out.
 */
function AnalyticsGate({ demo, children }: { demo: boolean; children: React.ReactNode }) {
  const { user } = useAuth();
  const blocked = demo || isDemoEmail(user?.email);
  useEffect(() => {
    analytics.setBlocked(blocked);
  }, [blocked]);
  return <AnalyticsBlockedContext.Provider value={blocked}>{children}</AnalyticsBlockedContext.Provider>;
}

/**
 * Identifies the signed-in user once analytics consent is granted (opt-in).
 * Same distinct id (Supabase user id) on web and desktop: the desktop shell loads this app.
 */
function AnalyticsIdentity() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const consent = useSyncExternalStore(
    analytics.subscribeConsent,
    analytics.consentStatus,
    () => 'pending' as const,
  );
  const userId = user?.id;
  const userEmail = user?.email;

  useEffect(() => {
    if (consent !== 'granted') return;
    analytics.registerPlatform();
    if (userId) analytics.identify({ id: userId, email: userEmail }, { locale });
  }, [consent, userId, userEmail, locale]);

  return null;
}

// ── Combined providers ─────────────────────────────────────────────────────────────────────────

export function Providers({
  children,
  user,
  initialLocale = DEFAULT_LOCALE,
  demo = false,
}: {
  children: React.ReactNode;
  user: AuthUser | null;
  /** Locale before the visitor has chosen one (from the browser language). */
  initialLocale?: Locale;
  /** The request is for the public demo host: no analytics at all. */
  demo?: boolean;
}) {
  return (
    <AuthProvider initialUser={user}>
      <AnalyticsGate demo={demo}>
        <LocaleProvider initialLocale={initialLocale}>
          {children}
          <AnalyticsIdentity />
          <ConsentBanner />
        </LocaleProvider>
      </AnalyticsGate>
    </AuthProvider>
  );
}
