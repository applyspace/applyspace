'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useLocalStorageItem } from '@/lib/useLocalStorage';
import type { Locale, T } from '@/lib/i18n';
import { translations } from '@/lib/i18n';
import { toAuthUser, type AuthUser } from '@/lib/auth-user';
import { createClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import posthog from 'posthog-js';

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
        else posthog.reset();
      } else if (nextUser && userIdRef.current && userIdRef.current !== nextUser.id) {
        // A direct account switch must not merge the previous account's activity.
        posthog.reset();
      }

      userIdRef.current = nextUser?.id ?? null;
      setUser((currentUser) => (currentUser?.id === nextUser?.id ? currentUser : nextUser));
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    posthog.identify(user.id, {
      email: user.email ?? undefined,
      name: user.name ?? undefined,
    });
  }, [user]);

  const signOut = useCallback(async () => {
    posthog.capture('sign_out_completed');
    didResetForSignOutRef.current = true;
    posthog.reset();
    if (isSupabaseConfigured) await createClient().auth.signOut();
    window.location.assign('/login');
  }, []);

  return <AuthContext.Provider value={{ user, signOut }}>{children}</AuthContext.Provider>;
}

// ── Combined providers ─────────────────────────────────────────────────────────────────────────

export function Providers({
  children,
  user,
  initialLocale = DEFAULT_LOCALE,
}: {
  children: React.ReactNode;
  user: AuthUser | null;
  /** Locale before the visitor has chosen one (from the browser language). */
  initialLocale?: Locale;
}) {
  return (
    <AuthProvider initialUser={user}>
      <LocaleProvider initialLocale={initialLocale}>{children}</LocaleProvider>
    </AuthProvider>
  );
}
