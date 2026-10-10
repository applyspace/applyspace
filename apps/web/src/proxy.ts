import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isDemoHost, isDemoWriteBlocked } from '@/lib/demo-host';
import { siteRoute } from '@/lib/site-routing';
import {
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
  isSupabaseConfigured,
} from '@/lib/supabase/env';

/**
 * The public website is built into this app except in the desktop build
 * (`APPLY_SITE_ENABLED=0`, set by next.config.ts when `APPLY_DESKTOP_BUILD=1`).
 */
const SITE_ENABLED = process.env.APPLY_SITE_ENABLED !== '0';

/**
 * Keeps the Supabase session cookie fresh on every request and gates the app:
 * signed-out visitors see the public website on `/` and the marketing pages
 * (see `lib/site-routing.ts`), every other page except `/login`, `/auth/*` and
 * `/api/*` needs a session (signed-out visitors land on the sign-in page), and
 * signed-in users land on the Home page (`/`) and never see the website. The public demo (`demo.applyspace.app`, see `lib/demo-host.ts`)
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
  const { pathname } = request.nextUrl;
  // SEO files and the CMS webhook: public, no session needed.
  if (siteRoute(pathname, false, SITE_ENABLED).kind === 'public') return response;
  if (!isSupabaseConfigured) return siteResponse(request, response, siteRoute(pathname, false, SITE_ENABLED)) ?? response;

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
    return siteResponse(request, response, siteRoute(pathname, false, SITE_ENABLED)) ?? response;
  }

  const site = siteResponse(request, response, siteRoute(pathname, signedIn, SITE_ENABLED));
  if (site) return site;

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

/** Response for a website route (rewrite or redirect), or null when the app handles the request. */
function siteResponse(
  request: NextRequest,
  response: NextResponse,
  route: ReturnType<typeof siteRoute>,
): NextResponse | null {
  if (route.kind === 'app' || route.kind === 'public') return null;
  const { search } = request.nextUrl;
  const next =
    route.kind === 'site'
      ? NextResponse.rewrite(new URL(`${route.rewrite}${search}`, request.url))
      : NextResponse.redirect(new URL(`${route.to}${search}`, request.url), 308);
  // Keep any refreshed session cookies.
  for (const cookie of response.cookies.getAll()) next.cookies.set(cookie);
  return next;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif)$).*)'],
};
