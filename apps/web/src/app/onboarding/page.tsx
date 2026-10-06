import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';
import { getAccount } from '@/lib/candidate-profile';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { getSupabaseScope } from '@/lib/supabase/scope';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Welcome to Apply' };

/**
 * First-run onboarding: a focused full-page flow. It lives outside the
 * `(auth)` route group on purpose: no sidebar shell, and the onboarding guard
 * in `(auth)/layout.tsx` does not run here, so this page can never redirect to
 * itself.
 */
export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ restart?: string }>;
}) {
  const scope = await getSupabaseScope();

  if (!scope) {
    // Signed out on the real app: sign in first. The demo and the desktop app
    // (no account) get a read-only preview of the flow.
    if (isSupabaseConfigured && process.env.APPLY_DEMO !== '1') redirect('/login');
    return <OnboardingFlow initialFirstName="" initialLastName="" />;
  }

  let firstName = '';
  let lastName = '';
  let alreadyOnboarded = false;
  try {
    const account = await getAccount(scope);
    ({ firstName, lastName } = account);
    alreadyOnboarded = account.onboardedAt !== null;
  } catch {
    // Account unreadable: show the flow with empty fields rather than failing.
  }

  // Onboarding happens once. `/onboarding?restart=1` opens it again on purpose.
  const { restart } = await searchParams;
  if (alreadyOnboarded && restart !== '1') redirect('/');

  return <OnboardingFlow initialFirstName={firstName} initialLastName={lastName} />;
}
