import { NextResponse } from 'next/server';
import { decideDemoLogin } from '@/lib/demo-login';
import { isDemoRequest } from '@/lib/hosted';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';

/**
 * Founder-only sign-in to the demo account on previews and local runs:
 *   https://<preview>.vercel.app/auth/demo?key=<DEMO_LOGIN_KEY>
 * Answers 404 unless every condition of `decideDemoLogin` holds (explicitly
 * enabled, not production, not the public demo host, key matches, email on
 * example.com). See docs/demo-account.md.
 */
export const dynamic = 'force-dynamic';

const notFound = () => new NextResponse('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } });

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const decision = decideDemoLogin(
    {
      DEMO_LOGIN_ENABLED: process.env.DEMO_LOGIN_ENABLED,
      DEMO_LOGIN_KEY: process.env.DEMO_LOGIN_KEY,
      DEMO_USER_EMAIL: process.env.DEMO_USER_EMAIL,
      DEMO_USER_PASSWORD: process.env.DEMO_USER_PASSWORD,
      VERCEL_ENV: process.env.VERCEL_ENV,
    },
    {
      key: searchParams.get('key'),
      onDemoHost: await isDemoRequest(),
    },
  );
  if (!decision.allowed || !isSupabaseConfigured) return notFound();

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: decision.email, password: decision.password });
  // Keep the key out of referrers and caches.
  const headers = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' };
  if (error) return NextResponse.redirect(`${origin}/login?error=auth`, { status: 303, headers });
  return NextResponse.redirect(`${origin}/`, { status: 303, headers });
}
