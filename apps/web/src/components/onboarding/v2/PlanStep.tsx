'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import { Tick02Icon } from '@hugeicons/core-free-icons';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StepHeader } from '@/components/onboarding/v2/StepHeader';
import { cn } from '@/lib/utils';

const PLANS = [
  {
    name: 'Apply FREE',
    tagline: 'Everything to start your search.',
    current: true,
    features: ['1 search profile', '3 job titles, 3 locations', '15 active applications', 'Fit message generation'],
  },
  {
    name: 'Apply PLUS',
    tagline: 'More profiles, more criteria.',
    current: false,
    features: ['3 search profiles', '6 job titles', '99 active applications', 'Network connections at a company'],
  },
  {
    name: 'Apply MAX',
    tagline: 'No limits.',
    current: false,
    features: ['Unlimited search profiles', 'Unlimited titles and locations', 'Unlimited applications', 'Everything in PLUS'],
  },
] as const;

/** Final step: the user starts on FREE. Paid plans are shown but cannot be bought yet, so there is nothing to select. */
export function PlanStep() {
  return (
    <>
      <StepHeader title="You start on Apply FREE" subtitle="Paid plans are coming soon. Your data stays if you switch later." />
      <div className="mx-auto grid max-w-3xl grid-cols-3 gap-4">
        {PLANS.map((p) => (
          <Card key={p.name} className={cn('gap-4', p.current && 'ring-2 ring-foreground')}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {p.name}
                {p.current ? <Badge>Your plan</Badge> : <Badge variant="secondary">Coming soon</Badge>}
              </CardTitle>
              <CardDescription>{p.tagline}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2.5 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <HugeiconsIcon icon={Tick02Icon} size={16} strokeWidth={2} className="mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
