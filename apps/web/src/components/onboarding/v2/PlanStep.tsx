'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { StepHeader } from '@/components/onboarding/v2/StepHeader';
import { cn } from '@/lib/utils';

const PLANS = [
  {
    key: 'FREE',
    color: 'text-emerald-600',
    tagline: 'Everything to start your search.',
    intro: null,
    features: ['1 search profile', '15 applications, whatever their status', 'Fit message generation', 'Application and interview tracking'],
    cta: 'outline',
  },
  {
    key: 'PLUS',
    color: 'text-violet-600',
    tagline: 'More profiles, sharper search.',
    intro: 'Everything in FREE, and:',
    features: ['3 search profiles', '99 applications', 'Advanced search filters', 'Company insights', 'Network connections at a company'],
    cta: 'default',
  },
  {
    key: 'MAX',
    color: 'text-amber-500',
    tagline: 'No limits, all features.',
    intro: 'Everything in PLUS, and:',
    features: ['Unlimited search profiles', 'Unlimited applications', 'Unlimited extra files in Resources'],
    cta: 'default',
  },
] as const;

/** Final step. Plans are not selectable cards: each "Select plan" button moves forward. Billing is fictional for now. */
export function PlanStep({ onSelect }: { onSelect: (plan: string) => void }) {
  return (
    <>
      <StepHeader title="Choose your plan" subtitle="Start free and upgrade whenever you need more." />
      <div className="mx-auto grid max-w-5xl grid-cols-3 gap-5">
        {PLANS.map((p) => (
          <Card key={p.key} className="gap-5 py-6">
            <CardHeader>
              <p className="text-sm font-medium text-muted-foreground">Apply</p>
              <p className={cn('font-sans text-5xl font-extrabold tracking-[0.08em]', p.color)}>{p.key}</p>
              <CardDescription className="pt-1">{p.tagline}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-5">
              <Button variant={p.cta} size="lg" className="w-full" onClick={() => onSelect(p.key)}>
                Select plan
              </Button>
              <div className="space-y-3 text-sm">
                {p.intro && <p className="font-medium">{p.intro}</p>}
                <ul className="space-y-2.5">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-foreground" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
