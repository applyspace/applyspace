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
  Crown03Icon,
  CursorMagicSelection01Icon,
  File01Icon,
  FilterIcon,
  Layers01Icon,
  Message01Icon,
  Mic01Icon,
  Mic02Icon,
  Notification01Icon,
  Presentation01Icon,
  Rocket01Icon,
  Search01Icon,
  Tick02Icon,
  UserMultiple02Icon,
} from '@hugeicons/core-free-icons';
import { AvatarGroup } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { brandLogoUrl } from '@/lib/brandfetch';
import { StepHeader } from '@/components/onboarding/v2/StepHeader';
import { cn } from '@/lib/utils';

/** AI tools the user can connect their own account to. Logos come from Brandfetch; initials stand in if they fail to load. */
const AI_TOOLS = [
  { name: 'Claude', domain: 'claude.ai' },
  { name: 'ChatGPT', domain: 'chatgpt.com' },
  { name: 'Gemini', domain: 'gemini.google.com' },
];

/**
 * Billing periods. Discounts are hypothetical: -10% for 3 months and -30% for a year keep Apply profitable
 * because the payment fee is a fixed part of every charge, so fewer, larger charges leave more margin.
 */
const PERIODS = [
  { value: 'month', label: 'Monthly', months: 1, discount: 0, billed: 'every month' },
  { value: 'quarter', label: 'Quarterly', months: 3, discount: 0.1, billed: 'every 3 months' },
  { value: 'year', label: 'Yearly', months: 12, discount: 0.3, billed: 'every year' },
] as const;
type Period = (typeof PERIODS)[number]['value'];

type Feature = { text: string; icon: IconSvgElement; aiTools?: boolean };

const CORE_FEATURES: Feature[] = [
  { text: 'Application tracking', icon: CheckListIcon },
  { text: 'Interview preparation', icon: Mic01Icon },
  { text: 'Resume rewrite', icon: File01Icon },
  { text: 'Fit message generation', icon: Message01Icon },
  { text: 'Job alerts', icon: Notification01Icon },
  { text: 'Application autofill', icon: CursorMagicSelection01Icon },
  { text: 'AI Integrations', icon: AiMagicIcon, aiTools: true },
];

const PLUS_FEATURES: Feature[] = [
  { text: 'Advanced search filters', icon: FilterIcon },
  { text: 'Company insights', icon: Building03Icon },
  { text: 'Network connections', icon: UserMultiple02Icon },
  { text: 'Interview simulation', icon: Mic02Icon },
];

type Plan = {
  key: string;
  name: string;
  tagline: string;
  headerClass: string;
  tileClass: string;
  accent: string;
  icon: IconSvgElement;
  price: number;
  limits: string[];
  intro: string | null;
  features: Feature[];
  cta: 'outline' | 'default';
};

const PLANS: Plan[] = [
  {
    key: 'free',
    name: 'Free',
    tagline: 'Everything you need to start your search.',
    headerClass: 'bg-blue-600',
    tileClass: 'bg-blue-200 text-blue-700',
    accent: 'text-blue-600',
    icon: Rocket01Icon,
    price: 0,
    limits: ['15 applications', '1 search profile', '1 interview template'],
    intro: null,
    features: CORE_FEATURES,
    cta: 'outline',
  },
  {
    key: 'plus',
    name: 'Plus',
    tagline: 'More room, sharper search.',
    headerClass: 'bg-emerald-600',
    tileClass: 'bg-emerald-200 text-emerald-700',
    accent: 'text-emerald-600',
    icon: Layers01Icon,
    price: 0.99,
    limits: ['99 applications', '3 search profiles', '3 interview templates'],
    intro: 'Everything in Free, plus…',
    features: PLUS_FEATURES,
    cta: 'default',
  },
  {
    key: 'max',
    name: 'Max',
    tagline: 'No limits on anything.',
    headerClass: 'bg-fuchsia-600',
    tileClass: 'bg-fuchsia-200 text-fuchsia-700',
    accent: 'text-fuchsia-600',
    icon: Crown03Icon,
    price: 3.99,
    limits: ['Unlimited applications', 'Unlimited search profiles', 'Unlimited interview templates'],
    intro: 'Everything in Plus',
    features: [],
    cta: 'default',
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

const euro = (n: number) => `€${n.toFixed(2)}`;

/** Round logo; plain <img> (same approach as the sign-in offers list) with an initial if it fails to load. */
function ToolLogo({ name, domain }: { name: string; domain: string }) {
  const [missing, setMissing] = useState(false);
  return (
    <span
      data-slot="avatar"
      title={name}
      className="flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-card text-xs text-muted-foreground"
    >
      {missing ? (
        name[0]
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={brandLogoUrl(domain)}
          alt={name}
          width={48}
          height={48}
          className="size-full object-cover"
          onError={() => setMissing(true)}
          ref={(img) => {
            if (img && img.complete && img.naturalWidth === 0) setMissing(true);
          }}
        />
      )}
    </span>
  );
}

/** Round, overlapping logos of the supported AI tools. */
function AiToolsStack() {
  return (
    <AvatarGroup>
      {AI_TOOLS.map((t) => (
        <ToolLogo key={t.name} name={t.name} domain={t.domain} />
      ))}
    </AvatarGroup>
  );
}

function PlanCard({ plan, period, onSelect }: { plan: Plan; period: (typeof PERIODS)[number]; onSelect: (plan: string) => void }) {
  const perMonth = plan.price * (1 - period.discount);
  return (
    <Card className="gap-0 overflow-hidden rounded-3xl bg-muted/40 py-0">
      <div className={cn('flex min-h-48 flex-col justify-end gap-1 rounded-3xl px-6 py-6 text-white', plan.headerClass)}>
        <span className={cn('mb-auto flex size-12 items-center justify-center rounded-2xl', plan.tileClass)}>
          <HugeiconsIcon icon={plan.icon} size={24} strokeWidth={1.8} />
        </span>
        <p className="font-sans text-2xl font-medium">{plan.name}</p>
        <p className="text-sm text-white/85">{plan.tagline}</p>
      </div>

      <div className="flex flex-1 flex-col gap-5 px-6 pt-6 pb-6">
        <div className="min-h-16">
          <p className="font-sans text-4xl font-medium tabular-nums">
            {plan.price === 0 ? 'Free' : euro(perMonth)}
            {plan.price !== 0 && <span className="text-base font-normal text-muted-foreground">/mo</span>}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {plan.price === 0 ? 'No card needed' : period.months === 1 ? 'Billed every month' : `${euro(perMonth * period.months)} billed ${period.billed}`}
          </p>
        </div>

        <div className="space-y-2">
          {plan.limits.map((text, i) => (
            <div key={text} className="flex h-11 items-center gap-3 rounded-xl bg-card px-3 text-sm ring-1 ring-foreground/10">
              <HugeiconsIcon icon={LIMIT_ICONS[i]} size={18} strokeWidth={1.8} className={plan.accent} />
              {text}
            </div>
          ))}
        </div>

        <div className="border-t pt-5">
          {plan.intro && <p className="mb-3 text-sm text-muted-foreground italic">{plan.intro}</p>}
          <ul className="space-y-2.5 text-sm">
            {plan.features.map((f) => (
              <li key={f.text} className="flex items-center gap-3">
                {f.aiTools ? <AiToolsStack /> : <HugeiconsIcon icon={f.icon} size={18} strokeWidth={1.8} className={cn('shrink-0', plan.accent)} />}
                {f.text}
              </li>
            ))}
          </ul>
        </div>

        <Button variant={plan.cta} size="lg" className="mt-auto w-full" onClick={() => onSelect(plan.key)}>
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
        <ToggleGroup value={[periodKey]} onValueChange={(v) => v[0] && setPeriodKey(v[0] as Period)} aria-label="Billing period">
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
