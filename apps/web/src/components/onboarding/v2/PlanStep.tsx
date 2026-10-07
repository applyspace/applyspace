'use client';

import { useState } from 'react';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import {
  AiMagicIcon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  Briefcase01Icon,
  Building03Icon,
  Calendar03Icon,
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
import { ClaudeLogo, GmailLogo, GoogleCalendarLogo, OpenAILogo } from '@/components/onboarding/v2/BrandIcons';
import { StepHeader } from '@/components/onboarding/v2/StepHeader';
import { SEGMENT_GROUP, SEGMENT_ITEM } from '@/components/onboarding/v2/fields';
import { cn } from '@/lib/utils';

type Logo = { name: string; Icon: (props: { className?: string }) => React.ReactNode };

/** Accounts a feature connects to, shown as official inline SVG marks next to its name. */
const AI_TOOLS: Logo[] = [
  { name: 'Claude', Icon: ClaudeLogo },
  { name: 'OpenAI', Icon: OpenAILogo },
];
const MAIL_TOOLS: Logo[] = [{ name: 'Gmail', Icon: GmailLogo }];
const CALENDAR_TOOLS: Logo[] = [{ name: 'Google Calendar', Icon: GoogleCalendarLogo }];

/**
 * Billing periods. The discount is hypothetical: -10% for 3 months keeps Apply profitable
 * because the payment fee is a fixed part of every charge, so fewer, larger charges leave more margin.
 */
const PERIODS = [
  { value: 'month', label: 'Monthly', discount: 0, note: 'Billed monthly' },
  { value: 'quarter', label: 'Quarterly', discount: 0.1, note: 'Billed quarterly' },
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
  { text: 'Interview calendar sync', icon: Calendar03Icon, logos: CALENDAR_TOOLS },
  { text: 'Interview simulation', icon: Mic02Icon },
];

type Plan = {
  key: string;
  name: string;
  tagline: string;
  accent: string;
  card: string;
  muted: string;
  badge?: boolean;
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
    card: 'bg-stone-100',
    muted: 'text-stone-600',
    price: 0,
    limits: ['15 applications', '1 search profile', '1 interview template'],
    intro: null,
    features: CORE_FEATURES,
  },
  {
    key: 'plus',
    name: 'Plus',
    tagline: 'More room, sharper search.',
    accent: 'text-[#1F0D2C]',
    card: 'bg-[#E2B8FF]',
    muted: 'text-[#1F0D2C]/70',
    badge: true,
    price: 0.99,
    limits: ['99 applications', '3 search profiles', '3 interview templates'],
    intro: 'Everything in Free, plus…',
    features: PLUS_FEATURES,
  },
  {
    key: 'max',
    name: 'Max',
    tagline: 'No limits on anything.',
    accent: 'text-pink-700',
    card: 'bg-pink-200',
    muted: 'text-pink-950/70',
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
    <span className="ml-1.5 inline-flex items-center gap-2">
      {logos.map((l) => (
        <l.Icon key={l.name} className="size-5 shrink-0" />
      ))}
    </span>
  );
}

/** No header colour, no dividers, no shadows: each plan is a soft fill (stone, brand lilac, pink) and Plus carries the Popular badge. */
function PlanCard({ plan, period, onSelect }: { plan: Plan; period: (typeof PERIODS)[number]; onSelect: (plan: string) => void }) {
  const perMonth = plan.price * (1 - period.discount);
  return (
    <Card className={cn('gap-0 rounded-3xl py-0 ring-0', plan.card)}>
      <div className="flex flex-1 flex-col gap-6 p-7">
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <p className="font-sans text-2xl font-medium">{plan.name}</p>
            {plan.badge && <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-[#1F0D2C]">Popular</span>}
          </div>
          <p className={cn('text-sm', plan.muted)}>{plan.tagline}</p>
        </div>

        <div>
          <p className="font-sans text-4xl font-medium tabular-nums">
            {euro(perMonth)}
            <span className={cn('text-base font-normal', plan.muted)}>/mo</span>
          </p>
          <p className={cn('mt-1 text-sm', plan.muted)}>{plan.price === 0 ? 'No card needed' : period.note}</p>
        </div>

        <Button variant={plan.key === 'free' ? 'outline' : 'default'} size="lg" className="w-full" onClick={() => onSelect(plan.key)}>
          Select plan
        </Button>

        <ul className="space-y-3 text-sm">
          {plan.limits.map((text, i) => (
            <li key={text} className="flex items-center gap-3">
              <HugeiconsIcon icon={LIMIT_ICONS[i]} size={18} strokeWidth={1.8} className={cn('shrink-0', plan.accent)} />
              {text}
            </li>
          ))}
        </ul>

        <div>
          {plan.intro && <p className={cn('mb-3 text-sm italic', plan.muted)}>{plan.intro}</p>}
          <ul className="space-y-2.5 text-sm">
            {plan.features.map((f) => (
              <li key={f.text} className="flex items-center gap-3">
                <HugeiconsIcon icon={Tick02Icon} size={18} strokeWidth={2} className={cn('shrink-0', plan.accent)} />
                <span className="flex items-center">
                  {f.text}
                  {f.logos && <InlineLogos logos={f.logos} />}
                </span>
              </li>
            ))}
          </ul>
        </div>
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
        <ToggleGroup spacing={1} className={SEGMENT_GROUP} value={[periodKey]} onValueChange={(v) => v[0] && setPeriodKey(v[0] as Period)} aria-label="Billing period">
          {PERIODS.map((p) => (
            <ToggleGroupItem key={p.value} value={p.value} className={cn(SEGMENT_ITEM, 'h-10 gap-2 px-5 text-sm')}>
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
