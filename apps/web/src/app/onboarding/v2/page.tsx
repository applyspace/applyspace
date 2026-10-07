import type { Metadata } from 'next';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { OnboardingV2 } from '@/components/onboarding/v2/OnboardingV2';

export const metadata: Metadata = { title: 'Onboarding v2 (preview)' };

/** Dev and preview deployments only: the v2 onboarding screens with no data or auth. */
export default function OnboardingV2Page() {
  if (process.env.VERCEL_ENV === 'production') notFound();
  // OnboardingV2 reads the step from the URL (useSearchParams).
  return (
    <Suspense>
      <OnboardingV2 />
    </Suspense>
  );
}
