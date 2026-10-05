'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { Locale, T } from '@/lib/i18n';
import { translations } from '@/lib/i18n';
import { toAuthUser, type AuthUser } from '@/lib/auth-user';
import { createClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/env';

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

function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    const saved = localStorage.getItem('apply-locale') as Locale | null;
    if (saved === 'en' || saved === 'fr') setLocaleState(saved);
  }, []);

  function setLocale(l: Locale) {
    setLocaleState(l);
    localStorage.setItem('apply-locale', l);
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

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const { data } = createClient().auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? toAuthUser(session.user) : null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    if (isSupabaseConfigured) await createClient().auth.signOut();
    window.location.assign('/login');
  }, []);

  return <AuthContext.Provider value={{ user, signOut }}>{children}</AuthContext.Provider>;
}

// ── Combined providers ─────────────────────────────────────────────────────────────────────────

export function Providers({
  children,
  user,
}: {
  children: React.ReactNode;
  user: AuthUser | null;
}) {
  return (
    <AuthProvider initialUser={user}>
      <LocaleProvider>{children}</LocaleProvider>
    </AuthProvider>
  );
}
