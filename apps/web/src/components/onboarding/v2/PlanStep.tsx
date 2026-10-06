'use client';

import { Avatar, AvatarFallback, AvatarGroup, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { brandLogoUrl } from '@/lib/brandfetch';
import { StepHeader } from '@/components/onboarding/v2/StepHeader';
import { cn } from '@/lib/utils';

/** AI tools the user can connect their own account to. Logos come from Brandfetch; initials stand in if they fail to load. */
const AI_TOOLS = [
  { name: 'Claude', domain: 'claude.ai' },
  { name: 'ChatGPT', domain: 'chatgpt.com' },
  { name: 'Gemini', domain: 'gemini.google.com' },
];

type Feature = { text: string; aiTools?: boolean };

const PLANS: {
  key: string;
  color: string;
  tagline: string;
  intro: string | null;
  features: Feature[];
  cta: 'outline' | 'default';
}[] = [
  {
    key: 'FREE',
    color: 'text-emerald-600',
    tagline: 'Everything to start your search.',
    intro: null,
    features: [
      { text: '1 search profile' },
      { text: '15 applications, whatever their status' },
      { text: 'Application autofill' },
      { text: 'Job alerts' },
      { text: 'Resume rewrite' },
      { text: 'Fit message generation' },
      { text: '1 interview template' },
    ],
    cta: 'outline',
  },
  {
    key: 'PLUS',
    color: 'text-violet-600',
    tagline: 'More profiles, sharper search.',
    intro: 'Everything in FREE, and:',
    features: [
      { text: '3 search profiles' },
      { text: '99 applications' },
      { text: '3 interview templates' },
      { text: 'Interview simulation' },
      { text: 'Advanced search filters' },
      { text: 'No-go list' },
      { text: 'Company insights' },
      { text: 'Network connections at a company' },
      { text: 'AI tool integrations', aiTools: true },
    ],
    cta: 'default',
  },
  {
    key: 'MAX',
    color: 'text-amber-500',
    tagline: 'No limits, all features.',
    intro: 'Everything in PLUS, and:',
    features: [
      { text: 'Unlimited search profiles' },
      { text: 'Unlimited applications' },
      { text: 'Unlimited interview templates' },
      { text: 'Unlimited extra files in Resources' },
    ],
    cta: 'default',
  },
];

/** Round, overlapping logos of the supported AI tools. */
function AiToolsStack() {
  return (
    <AvatarGroup className="ml-auto">
      {AI_TOOLS.map((t) => (
        <Avatar key={t.name} size="sm" title={t.name}>
          <AvatarImage src={brandLogoUrl(t.domain)} alt={t.name} />
          <AvatarFallback>{t.name.slice(0, 1)}</AvatarFallback>
        </Avatar>
      ))}
    </AvatarGroup>
  );
}

/** Final step. Plans are not selectable cards: each "Select plan" button moves forward. Billing is fictional for now. */
export function PlanStep({ onSelect }: { onSelect: (plan: string) => void }) {
  return (
    <>
      <StepHeader title="Choose your plan" subtitle="Start free and upgrade whenever you need more." />
      <div className="mx-auto grid max-w-5xl grid-cols-3 gap-5">
        {PLANS.map((p) => (
          <Card key={p.key} className="gap-3 py-4">
            <CardHeader>
              <p className={cn('font-sans text-5xl font-extrabold tracking-[0.08em]', p.color)}>{p.key}</p>
              <CardDescription>{p.tagline}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-3">
              <Button variant={p.cta} size="lg" className="w-full" onClick={() => onSelect(p.key)}>
                Select plan
              </Button>
              <div className="space-y-2 text-sm">
                {p.intro && <p className="font-medium">{p.intro}</p>}
                <ul className="space-y-1.5">
                  {p.features.map((f) => (
                    <li key={f.text} className="flex items-center gap-2.5">
                      <span className="size-1.5 shrink-0 rounded-full bg-foreground" />
                      {f.text}
                      {f.aiTools && <AiToolsStack />}
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
