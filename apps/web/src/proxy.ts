import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isDemoHost } from '@/lib/demo-host';
import {
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
  isSupabaseConfigured,
} from '@/lib/supabase/env';

/**
 * Keeps the Supabase session cookie fresh on every request and gates the app:
 * every page except `/login`, `/auth/*` and `/api/*` needs a session, so
 * signed-out visitors land on the sign-in page and signed-in users on the Home
 * page (`/`). The public demo (`demo.applyspace.app`, see `lib/demo-host.ts`)
 * is the one exception: it serves fixtures, never reads a session and is never
 * gated. Previews and the main domain are the real app.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!isSupabaseConfigured) return response;
  if (isDemoHost(request.headers.get('x-forwarded-host') ?? request.headers.get('host'))) {
    return response;
  }

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
  const isPublic =
    pathname === '/login' || pathname.startsWith('/auth/') || pathname.startsWith('/api/');
  if (!signedIn && !isPublic) target = '/login';
  else if (pathname === '/login' && signedIn) target = '/';
  if (!target) return response;

  // Keep any refreshed session cookies on the redirect.
  const redirect = NextResponse.redirect(new URL(target, request.url));
  for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
  return redirect;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
