import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';

/**
 * OAuth return point for Supabase Auth (Google, LinkedIn). Exchanges the
 * one-time `code` for a session cookie, then sends the user on.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  // Only allow same-site relative redirects.
  const next = searchParams.get('next') ?? '/';
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/';

  if (isSupabaseConfigured && code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${safeNext}`);
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
