import { toAuthUser, type AuthUser } from '@/lib/auth-user';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { createClient } from '@/lib/supabase/server';

/**
 * The signed-in user for the current request, or null when signed out or when
 * Supabase is not configured. Uses `getUser()`, which revalidates the session
 * with Supabase instead of trusting the cookie.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user ? toAuthUser(user) : null;
  } catch {
    return null;
  }
}
