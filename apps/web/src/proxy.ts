import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isDemoHost, isDemoWriteBlocked } from '@/lib/demo-host';
import { SITE_PROXY_HEADER, isSiteAsset, siteRoute } from '@/lib/site-routing';
import {
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
  isSupabaseConfigured,
} from '@/lib/supabase/env';

/**
 * The public website (`site/`, its own Vercel project) shares this origin when
 * `SITE_ORIGIN` is set (see `lib/site-routing.ts`). Unset on previews and
 * locally: signed-out visitors then go to `/login` as before.
 */
const SITE_ORIGIN = process.env.SITE_ORIGIN?.replace(/\/+$/, '') ?? '';

function rewriteToSite(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const headers = new Headers(request.headers);
  headers.set(SITE_PROXY_HEADER, '1');
  return NextResponse.rewrite(new URL(`${pathname}${search}`, SITE_ORIGIN), { request: { headers } });
}

/**
 * Keeps the Supabase session cookie fresh on every request and gates the app:
 * every page except `/login`, `/auth/*` and `/api/*` needs a session, so
 * signed-out visitors land on the sign-in page (or the website when `SITE_ORIGIN`
 * is set) and signed-in users on the Home page (`/`). The public demo (`demo.applyspace.app`, see `lib/demo-host.ts`)
 * is the one exception: it serves fixtures, never reads a session and is never
 * gated. Previews and the main domain are the real app.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  // The public demo is read-only and never reads a session (checked before anything else,
  // so it holds even when Supabase is not configured).
  if (isDemoHost(request.headers.get('x-forwarded-host') ?? request.headers.get('host'))) {
    if (isDemoWriteBlocked(request.method, request.nextUrl.pathname)) {
      return NextResponse.json(
        { error: 'demo_read_only', message: 'The public demo is read-only.' },
        { status: 403 },
      );
    }
    return response;
  }
  if (!isSupabaseConfigured) return response;

  if (SITE_ORIGIN && isSiteAsset(request.nextUrl.pathname)) return rewriteToSite(request);

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
  if (SITE_ORIGIN) {
    const route = siteRoute(pathname, signedIn);
    if (route === 'site') return rewriteToSite(request);
    if (route === 'redirect-home') target = '/';
  }
  const isPublic =
    pathname === '/login' || pathname.startsWith('/auth/') || pathname.startsWith('/api/');
  if (target) {
    // Signed-in user on a marketing page: the website is for visitors only.
  } else if (!signedIn && !isPublic) target = '/login';
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
