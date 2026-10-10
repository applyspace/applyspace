import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { OnboardingV2 } from '@/components/onboarding/v2/OnboardingV2';
import { getAccount } from '@/lib/candidate-profile';
import { isDemoRequest } from '@/lib/hosted';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { getSupabaseScope } from '@/lib/supabase/scope';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Welcome to Apply' };

/**
 * First-run onboarding: a focused full-page flow. It lives outside the
 * `(auth)` route group on purpose: no sidebar shell, and the onboarding guard
 * in `(auth)/layout.tsx` does not run here, so this page can never redirect to
 * itself.
 *
 * Access: signed out goes to `/login`; an account that is already onboarded goes
 * to Home. The demo and the desktop app (no account) get the flow as a preview.
 */
export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ restart?: string }>;
}) {
  const scope = await getSupabaseScope();

  if (!scope) {
    if (isSupabaseConfigured && !(await isDemoRequest())) redirect('/login');
    return <OnboardingV2 />;
  }

  let alreadyOnboarded = false;
  try {
    alreadyOnboarded = (await getAccount(scope)).onboardedAt !== null;
  } catch {
    // Account unreadable: show the flow rather than failing.
  }

  // Onboarding happens once. `?restart=1` reopens it for review, never in production.
  const { restart } = await searchParams;
  const canRestart = restart === '1' && process.env.VERCEL_ENV !== 'production';
  if (alreadyOnboarded && !canRestart) redirect('/');

  return <OnboardingV2 />;
}
