import { toAuthUser, type AuthUser } from '@/lib/auth-user';
import { getSupabaseScope } from '@/lib/supabase/scope';

/**
 * The signed-in user for the current request, or null when signed out or when
 * Supabase is not configured.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const scope = await getSupabaseScope();
  return scope ? toAuthUser(scope.user) : null;
}
