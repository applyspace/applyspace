'use client';

import { useState } from 'react';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import {
  AiMagicIcon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  Building03Icon,
  Calendar03Icon,
  FileValidationIcon,
  JobSearchIcon,
  NotepadTextDashedIcon,
  CheckListIcon,
  CursorMagicSelection01Icon,
  File01Icon,
  FilterIcon,
  Mail01Icon,
  Message01Icon,
  Mic01Icon,
  Mic02Icon,
  Notification01Icon,
  Tick02Icon,
  UserMultiple02Icon,
} from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Avatar, AvatarFallback, AvatarGroup, AvatarImage } from '@/components/ui/avatar';
import { brandAssetUrl, brandSymbolUrl } from '@/lib/brandfetch';
import { StepHeader } from '@/components/onboarding/v2/StepHeader';
import { SEGMENT_GROUP, SEGMENT_ITEM, SegmentPill } from '@/components/onboarding/v2/fields';
import { cn } from '@/lib/utils';

type Logo = { name: string; domain: string; src?: string };

// Google products are assets of the google.com brand in Brandfetch.
const google = (assetId: string) => brandAssetUrl('id6O2oGzv-', assetId);

/** Accounts a feature connects to. Every brand mark comes from Brandfetch, by domain. */
const AI_TOOLS: Logo[] = [
  { name: 'Claude', domain: 'claude.ai' },
  { name: 'OpenAI', domain: 'openai.com' },
  { name: 'Gemini', domain: 'google.com', src: google('idYgLxDNTi') },
];
const MAIL_TOOLS: Logo[] = [{ name: 'Gmail', domain: 'google.com', src: google('idBP5ltu-a') }];
const CALENDAR_TOOLS: Logo[] = [{ name: 'Google Calendar', domain: 'google.com', src: google('idMX2_OMSc') }];

/**
 * Billing periods. The discount is hypothetical: -15% for 3 months keeps Apply profitable
 * because the payment fee is a fixed part of every charge, so fewer, larger charges leave more margin.
 */
const PERIODS = [
  { value: 'month', label: 'Monthly', discount: 0, note: 'Billed monthly' },
  { value: 'quarter', label: 'Quarterly', discount: 0.15, note: 'Billed quarterly' },
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
  ring: string;
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
    ring: '#f5f5f4',
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
    card: 'border border-[#E2B8FF] bg-[#E2B8FF]/40',
    ring: '#f3e3ff',
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
    card: 'border border-pink-200 bg-pink-200/40',
    ring: '#fdecf5',
    muted: 'text-pink-950/70',
    price: 3.99,
    limits: ['Unlimited applications', 'Unlimited search profiles', 'Unlimited interview templates'],
    intro: 'Everything in Plus',
    features: [],
  },
];

const LIMIT_ICONS = [FileValidationIcon, JobSearchIcon, NotepadTextDashedIcon];

/** Rows of the full comparison table: true is a check, a string is shown as is, undefined is empty. */
const COMPARISON: { label: string; values: [boolean | string | undefined, boolean | string | undefined, boolean | string | undefined] }[] = [
  { label: 'Applications', values: ['15', '99', 'Unlimited'] },
  { label: 'Search profiles', values: ['1', '3', 'Unlimited'] },
  { label: 'Interview templates', values: ['1', '3', 'Unlimited'] },
  ...CORE_FEATURES.map((f) => ({ label: f.text, values: [true, true, true] as [boolean, boolean, boolean] })),
  ...PLUS_FEATURES.map((f) => ({ label: f.text, values: [undefined, true, true] as [undefined, boolean, boolean] })),
];

const euro = (n: number) => (n === 0 ? '€0' : `€${n.toFixed(2)}`);

/** Brand logos shown right next to a feature name: overlapping round avatars with a light border, the overlap ring matches the card fill. */
function InlineLogos({ logos, ring }: { logos: Logo[]; ring: string }) {
  return (
    <AvatarGroup className="ml-2.5 -space-x-1.5 *:data-[slot=avatar]:ring-(--pc)!" style={{ '--pc': ring } as React.CSSProperties}>
      {logos.map((l) => (
        <Avatar key={l.name} title={l.name} className="size-7 bg-white">
          <AvatarImage src={l.src ?? brandSymbolUrl(l.domain)} alt={l.name} className="object-contain p-1.5" />
          <AvatarFallback className="bg-white text-xs">{l.name[0]}</AvatarFallback>
        </Avatar>
      ))}
    </AvatarGroup>
  );
}

/** No header colour, no dividers, no shadows: each plan is a soft fill (stone, brand lilac, pink) and Plus carries the Popular badge. */
function PlanCard({ plan, period, onSelect }: { plan: Plan; period: (typeof PERIODS)[number]; onSelect: (plan: string) => void }) {
  const perMonth = plan.price * (1 - period.discount);
  return (
    <Card className={cn('gap-0 rounded-3xl py-0 ring-0', plan.card)}>
      <div className="flex flex-1 flex-col gap-6 px-7 pt-7 pb-10">
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

        <ul className="space-y-2 text-sm">
          {plan.limits.map((text, i) => (
            <li key={text} className="flex items-center gap-3 rounded-xl border border-foreground/10 bg-white/60 px-3.5 py-2.5">
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
                  {f.logos && <InlineLogos logos={f.logos} ring={plan.ring} />}
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
      <StepHeader title="Find the plan that fits your search" subtitle="Start free and upgrade whenever you need more." />
      <div className="mb-6 flex justify-center">
        <ToggleGroup spacing={1} className={SEGMENT_GROUP} value={[periodKey]} onValueChange={(v) => v[0] && setPeriodKey(v[0] as Period)} aria-label="Billing period">
          {PERIODS.map((p) => (
            <ToggleGroupItem key={p.value} value={p.value} className={cn(SEGMENT_ITEM, 'relative h-10 px-5 text-sm')}>
              {periodKey === p.value && <SegmentPill group="period" />}
              {p.label}
              {p.discount > 0 && <span className="absolute -top-2.5 -right-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">-{Math.round(p.discount * 100)}%</span>}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      <div className="mx-auto grid max-w-6xl grid-cols-3 items-stretch gap-5">
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
