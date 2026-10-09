import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
  isSupabaseConfigured,
} from '@/lib/supabase/env';

// Same rule as next.config.ts: the hosted build (Vercel), not desktop.
const IS_HOSTED = process.env.APPLY_DEMO === '1' || Boolean(process.env.VERCEL);

/**
 * Keeps the Supabase session cookie fresh on every request, and routes the
 * entry points: `/` and `/login`. Signed-out visitors land on the sign-in page,
 * signed-in users on the Home page (`/`). On the hosted build other routes are
 * not gated; on desktop and local dev every page needs a session, since there
 * is no local fallback database any more.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!isSupabaseConfigured) return response;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  let signedIn = false;
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    signedIn = user !== null;
  } catch {
    // Supabase unreachable: serve the page signed out rather than failing.
    return response;
  }

  const { pathname } = request.nextUrl;
  let target: string | null = null;
  if (IS_HOSTED) {
    // Home routing: signed-in users stay on `/` (the Home page), signed-out ones go to `/login`.
    if (pathname === '/' && !signedIn) target = '/login';
    else if (pathname === '/login' && signedIn) target = '/';
  } else {
    const isPublic =
      pathname === '/login' || pathname.startsWith('/auth/') || pathname.startsWith('/api/');
    if (!signedIn && !isPublic) target = '/login';
    else if (pathname === '/login' && signedIn) target = '/';
  }
  if (!target) return response;

  // Keep any refreshed session cookies on the redirect.
  const redirect = NextResponse.redirect(new URL(target, request.url));
  for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
  return redirect;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
