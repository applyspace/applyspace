import type { User } from '@supabase/supabase-js';
import { cache } from 'react';
import { isSupabaseConfigured } from './env';
import { createClient } from './server';

export interface SupabaseScope {
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: User;
  userId: string;
}

/**
 * The Supabase client and signed-in user for the current request, or null when
 * signed out or when Supabase is not configured. Data access reads this to
 * pick its backend: a scope means "use the user's Supabase data", null means
 * the local SQLite database (demo and desktop).
 *
 * Uses `getUser()`, which revalidates the session with Supabase instead of
 * trusting the cookie. Cached per request so layouts and pages share one call.
 */
export const getSupabaseScope = cache(async (): Promise<SupabaseScope | null> => {
  if (!isSupabaseConfigured) return null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user ? { supabase, user, userId: user.id } : null;
  } catch {
    return null;
  }
});
