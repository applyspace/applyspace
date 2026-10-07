'use client';

import { useState } from 'react';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import {
  AiMagicIcon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  Briefcase01Icon,
  Building03Icon,
  CheckListIcon,
  CursorMagicSelection01Icon,
  File01Icon,
  FilterIcon,
  Mail01Icon,
  Message01Icon,
  Mic01Icon,
  Mic02Icon,
  Notification01Icon,
  Presentation01Icon,
  Search01Icon,
  Tick02Icon,
  UserMultiple02Icon,
} from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { BrandLogo } from '@/components/onboarding/v2/BrandLogo';
import { StepHeader } from '@/components/onboarding/v2/StepHeader';
import { cn } from '@/lib/utils';

type Logo = { name: string; domain: string };

/** AI tools the user can connect their own account to, and the mailbox read by reply tracking. Logos come from Brandfetch. */
const AI_TOOLS: Logo[] = [
  { name: 'Claude', domain: 'claude.ai' },
  { name: 'OpenAI', domain: 'openai.com' },
];
const MAIL_TOOLS: Logo[] = [{ name: 'Gmail', domain: 'gmail.com' }];

/**
 * Billing periods. The discount is hypothetical: -10% for 3 months keeps Apply profitable
 * because the payment fee is a fixed part of every charge, so fewer, larger charges leave more margin.
 */
const PERIODS = [
  { value: 'month', label: 'Monthly', months: 1, discount: 0, billed: 'every month' },
  { value: 'quarter', label: 'Quarterly', months: 3, discount: 0.1, billed: 'every 3 months' },
] as const;
type Period = (typeof PERIODS)[number]['value'];

type Feature = { text: string; icon: IconSvgElement; logos?: Logo[] };

/** Ordered like a job search: find, prepare, apply, track, interview, then the AI accounts that power it. */
const CORE_FEATURES: Feature[] = [
  { text: 'Job alerts', icon: Notification01Icon },
  { text: 'Resume rewrite', icon: File01Icon },
  { text: 'Fit message generation', icon: Message01Icon },
  { text: 'Application autofill', icon: CursorMagicSelection01Icon },
  { text: 'Application tracking', icon: CheckListIcon },
  { text: 'Interview preparation', icon: Mic01Icon },
  { text: 'AI Integrations', icon: AiMagicIcon, logos: AI_TOOLS },
];

const PLUS_FEATURES: Feature[] = [
  { text: 'Advanced search filters', icon: FilterIcon },
  { text: 'Company insights', icon: Building03Icon },
  { text: 'Network connections', icon: UserMultiple02Icon },
  { text: 'Reply tracking', icon: Mail01Icon, logos: MAIL_TOOLS },
  { text: 'Interview simulation', icon: Mic02Icon },
];

type Plan = {
  key: string;
  name: string;
  tagline: string;
  accent: string;
  featured?: boolean;
  price: number;
  limits: string[];
  intro: string | null;
  features: Feature[];
};

const PLANS: Plan[] = [
  {
    key: 'free',
    name: 'Free',
    tagline: 'Everything you need to start your search.',
    accent: 'text-stone-700',
    price: 0,
    limits: ['15 applications', '1 search profile', '1 interview template'],
    intro: null,
    features: CORE_FEATURES,
  },
  {
    key: 'plus',
    name: 'Plus',
    tagline: 'More room, sharper search.',
    accent: 'text-blue-600',
    featured: true,
    price: 0.99,
    limits: ['99 applications', '3 search profiles', '3 interview templates'],
    intro: 'Everything in Free, plus…',
    features: PLUS_FEATURES,
  },
  {
    key: 'max',
    name: 'Max',
    tagline: 'No limits on anything.',
    accent: 'text-pink-600',
    price: 3.99,
    limits: ['Unlimited applications', 'Unlimited search profiles', 'Unlimited interview templates'],
    intro: 'Everything in Plus',
    features: [],
  },
];

const LIMIT_ICONS = [Briefcase01Icon, Search01Icon, Presentation01Icon];

/** Rows of the full comparison table: true is a check, a string is shown as is, undefined is empty. */
const COMPARISON: { label: string; values: [boolean | string | undefined, boolean | string | undefined, boolean | string | undefined] }[] = [
  { label: 'Applications', values: ['15', '99', 'Unlimited'] },
  { label: 'Search profiles', values: ['1', '3', 'Unlimited'] },
  { label: 'Interview templates', values: ['1', '3', 'Unlimited'] },
  ...CORE_FEATURES.map((f) => ({ label: f.text, values: [true, true, true] as [boolean, boolean, boolean] })),
  ...PLUS_FEATURES.map((f) => ({ label: f.text, values: [undefined, true, true] as [undefined, boolean, boolean] })),
];

const euro = (n: number) => (n === 0 ? '€0' : `€${n.toFixed(2)}`);

/** Brand logos shown right next to a feature name. */
function InlineLogos({ logos }: { logos: Logo[] }) {
  return (
    <span className="ml-1 inline-flex items-center gap-1.5">
      {logos.map((l) => (
        <BrandLogo key={l.name} name={l.name} domain={l.domain} kind="symbol" className="size-4 rounded-sm bg-transparent" />
      ))}
    </span>
  );
}

/** No header colour and no visible dividers: the featured plan stands out with a solid colour and a Popular badge. */
function PlanCard({ plan, period, onSelect }: { plan: Plan; period: (typeof PERIODS)[number]; onSelect: (plan: string) => void }) {
  const perMonth = plan.price * (1 - period.discount);
  const featured = plan.featured;
  const muted = featured ? 'text-white/75' : 'text-muted-foreground';
  return (
    <Card className={cn('gap-0 rounded-3xl py-0 ring-0', featured ? 'bg-blue-600 text-white' : 'bg-muted/40')}>
      <div className="flex flex-1 flex-col gap-6 p-7">
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <p className="font-sans text-2xl font-medium">{plan.name}</p>
            {featured && <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-blue-700">Popular</span>}
          </div>
          <p className={cn('text-sm', muted)}>{plan.tagline}</p>
        </div>

        <div className="min-h-16">
          <p className="font-sans text-4xl font-medium tabular-nums">
            {euro(perMonth)}
            <span className={cn('text-base font-normal', muted)}>/mo</span>
          </p>
          <p className={cn('mt-1 text-sm', muted)}>
            {plan.price === 0 ? 'No card needed' : period.months === 1 ? 'Billed every month' : `${euro(perMonth * period.months)} billed ${period.billed}`}
          </p>
        </div>

        <ul className="space-y-3 text-sm">
          {plan.limits.map((text, i) => (
            <li key={text} className="flex items-center gap-3">
              <HugeiconsIcon icon={LIMIT_ICONS[i]} size={18} strokeWidth={1.8} className={cn('shrink-0', featured ? 'text-white' : plan.accent)} />
              {text}
            </li>
          ))}
        </ul>

        <div>
          {plan.intro && <p className={cn('mb-3 text-sm italic', muted)}>{plan.intro}</p>}
          <ul className="space-y-2.5 text-sm">
            {plan.features.map((f) => (
              <li key={f.text} className="flex items-center gap-3">
                <HugeiconsIcon icon={Tick02Icon} size={18} strokeWidth={2} className={cn('shrink-0', featured ? 'text-white' : plan.accent)} />
                <span className="flex items-center">
                  {f.text}
                  {f.logos && <InlineLogos logos={f.logos} />}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <Button
          variant={plan.key === 'free' ? 'outline' : 'default'}
          size="lg"
          className={cn('mt-auto w-full', featured && 'bg-white text-blue-700 hover:bg-white/90')}
          onClick={() => onSelect(plan.key)}
        >
          Select plan
        </Button>
      </div>
    </Card>
  );
}

/** Full comparison: feature names on the left, a value or a check per plan on the right, no row lines. */
function ComparisonTable() {
  return (
    <div className="mx-auto mt-6 max-w-4xl">
      <div className="grid grid-cols-[1.6fr_1fr_1fr_1fr] items-center gap-y-3 text-sm">
        <span />
        {PLANS.map((p) => (
          <span key={p.key} className={cn('text-center font-sans text-lg font-medium', p.accent)}>
            {p.name}
          </span>
        ))}
        {COMPARISON.map((row) => (
          <div key={row.label} className="contents">
            <span className="py-1">{row.label}</span>
            {row.values.map((v, i) => (
              <span key={i} className="flex justify-center">
                {v === true ? <HugeiconsIcon icon={Tick02Icon} size={18} strokeWidth={2} className={PLANS[i].accent} /> : v}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Final step. Plans are not selectable cards: each "Select plan" button moves forward. Billing is fictional for now. */
export function PlanStep({ onSelect }: { onSelect: (plan: string) => void }) {
  const [periodKey, setPeriodKey] = useState<Period>('month');
  const [compare, setCompare] = useState(false);
  const period = PERIODS.find((p) => p.value === periodKey) ?? PERIODS[0];

  return (
    <>
      <StepHeader title="Choose your plan" subtitle="Start free and upgrade whenever you need more." />
      <div className="mb-6 flex justify-center">
        <ToggleGroup variant="outline" size="lg" spacing={2} value={[periodKey]} onValueChange={(v) => v[0] && setPeriodKey(v[0] as Period)} aria-label="Billing period">
          {PERIODS.map((p) => (
            <ToggleGroupItem key={p.value} value={p.value}>
              {p.label}
              {p.discount > 0 && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">-{p.discount * 100}%</span>}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      <div className="mx-auto grid max-w-5xl grid-cols-3 items-stretch gap-5">
        {PLANS.map((p) => (
          <PlanCard key={p.key} plan={p} period={period} onSelect={onSelect} />
        ))}
      </div>
      <div className="mt-6 flex justify-center">
        <Button variant="ghost" size="lg" onClick={() => setCompare(!compare)}>
          {compare ? 'Hide plan comparison' : 'See full plan comparison'}
          <HugeiconsIcon icon={compare ? ArrowUp01Icon : ArrowDown01Icon} size={16} strokeWidth={2} />
        </Button>
      </div>
      {compare && <ComparisonTable />}
    </>
  );
}
