import type { User } from '@supabase/supabase-js';

/** The signed-in user as the UI sees it. */
export interface AuthUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  /** Sign-in providers linked to the account, e.g. `google`, `linkedin_oidc`, `email`. */
  providers: string[];
}

/** Map a Supabase user (Google or LinkedIn OIDC metadata) to `AuthUser`. */
export function toAuthUser(user: User): AuthUser {
  const meta = user.user_metadata ?? {};
  return {
    id: user.id,
    email: user.email ?? null,
    name: meta.full_name ?? meta.name ?? null,
    image: meta.avatar_url ?? meta.picture ?? null,
    providers: Array.isArray(user.app_metadata?.providers)
      ? (user.app_metadata.providers as string[])
      : [],
  };
}
