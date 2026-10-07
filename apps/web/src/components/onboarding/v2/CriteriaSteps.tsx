'use client';

import { useState } from 'react';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import {
  Agreement03Icon,
  AiBrain01Icon,
  Airplane01Icon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  BankIcon,
  Briefcase01Icon,
  Building02Icon,
  Building05Icon,
  Building06Icon,
  Car01Icon,
  City01Icon,
  CodeIcon,
  Compass01Icon,
  DeliveryTruck01Icon,
  Dumbbell01Icon,
  EnergyIcon,
  Factory01Icon,
  FavouriteIcon,
  Film01Icon,
  GameController01Icon,
  GraduationScrollIcon,
  Home01Icon,
  Hotel01Icon,
  Legal01Icon,
  Medicine01Icon,
  Megaphone01Icon,
  Restaurant01Icon,
  Shield01Icon,
  Shirt01Icon,
  ShoppingBag01Icon,
  SmartPhone01Icon,
  Stethoscope02Icon,
  Ticket01Icon,
  TractorIcon,
  UmbrellaIcon,
  UserGroup02Icon,
  UserGroupIcon,
  UserMultipleIcon,
  Wallet01Icon,
  Wrench01Icon,
} from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Slider } from '@/components/ui/slider';
import { ChoiceCard, toggle } from '@/components/onboarding/v2/fields';
import { StepHeader } from '@/components/onboarding/v2/StepHeader';
import { cn } from '@/lib/utils';

export const CONTRACTS = ['Permanent', 'Freelance / Contract', 'Temporary', 'Part time', 'Internship', 'Apprenticeship', 'Volunteer', 'Other'];

const CURRENCIES = [
  { code: 'EUR', symbol: '€' },
  { code: 'USD', symbol: '$' },
  { code: 'GBP', symbol: '£' },
];

export const SALARY_MIN = 0;
export const SALARY_MAX = 100;

/**
 * Placeholder salary distribution (purely visual for now), one bar per 2K.
 * Two overlapping bumps (junior and senior pay) plus deterministic jitter, so it looks like real data.
 */
const SALARY_BARS = Array.from({ length: 50 }, (_, i) => {
  const x = (i + 0.5) * 2;
  const bump = (mu: number, sigma: number, h: number) => h * Math.exp(-((x - mu) ** 2) / (2 * sigma ** 2));
  const jitter = 0.72 + 0.56 * Math.abs(Math.sin(i * 12.9898 + 4.1) * Math.cos(i * 3.7 + 1.3));
  const roundNumber = x % 10 === 1 ? 1.12 : 1; // salaries cluster around round figures
  return Math.max(1.5, (bump(32, 10, 100) + bump(55, 14, 62) + bump(85, 18, 22)) * jitter * roundNumber);
});

const SIZES: { label: string; icon: IconSvgElement }[] = [
  { label: '1-10', icon: UserMultipleIcon },
  { label: '11-50', icon: UserGroupIcon },
  { label: '51-200', icon: Building02Icon },
  { label: '201-1,000', icon: Building05Icon },
  { label: '1,000+', icon: City01Icon },
];

type Tone = 'blue' | 'emerald' | 'rose' | 'orange' | 'violet' | 'teal' | 'amber' | 'slate';
const TONES: Record<Tone, string> = {
  blue: 'bg-blue-100 text-blue-600',
  emerald: 'bg-emerald-100 text-emerald-600',
  rose: 'bg-rose-100 text-rose-600',
  orange: 'bg-orange-100 text-orange-600',
  violet: 'bg-violet-100 text-violet-600',
  teal: 'bg-teal-100 text-teal-600',
  amber: 'bg-amber-100 text-amber-600',
  slate: 'bg-slate-100 text-slate-600',
};

/**
 * Sectors, coloured by family: tech blue, finance and property green, health rose, commerce and hospitality orange,
 * creative and media violet, impact and learning teal, industry and mobility amber, public and professional slate.
 */
const SECTORS: { label: string; icon: IconSvgElement; tone: Tone; top?: boolean }[] = [
  { label: 'Software & IT', icon: CodeIcon, tone: 'blue', top: true },
  { label: 'AI & data', icon: AiBrain01Icon, tone: 'blue', top: true },
  { label: 'Cybersecurity', icon: Shield01Icon, tone: 'blue' },
  { label: 'Gaming', icon: GameController01Icon, tone: 'blue' },
  { label: 'Finance & banking', icon: BankIcon, tone: 'emerald', top: true },
  { label: 'Fintech', icon: Wallet01Icon, tone: 'emerald' },
  { label: 'Insurance', icon: UmbrellaIcon, tone: 'emerald' },
  { label: 'Real estate', icon: Home01Icon, tone: 'emerald' },
  { label: 'Consulting', icon: Briefcase01Icon, tone: 'emerald', top: true },
  { label: 'Healthcare', icon: Stethoscope02Icon, tone: 'rose', top: true },
  { label: 'Pharma & biotech', icon: Medicine01Icon, tone: 'rose' },
  { label: 'Wellness & sport', icon: Dumbbell01Icon, tone: 'rose' },
  { label: 'Retail & e-commerce', icon: ShoppingBag01Icon, tone: 'orange', top: true },
  { label: 'Fashion & luxury', icon: Shirt01Icon, tone: 'orange' },
  { label: 'Food & beverage', icon: Restaurant01Icon, tone: 'orange' },
  { label: 'Hospitality & tourism', icon: Hotel01Icon, tone: 'orange' },
  { label: 'Media & entertainment', icon: Film01Icon, tone: 'violet', top: true },
  { label: 'Design & architecture', icon: Compass01Icon, tone: 'violet' },
  { label: 'Marketing & advertising', icon: Megaphone01Icon, tone: 'violet', top: true },
  { label: 'Arts & culture', icon: Ticket01Icon, tone: 'violet' },
  { label: 'Education', icon: GraduationScrollIcon, tone: 'teal', top: true },
  { label: 'Nonprofit', icon: FavouriteIcon, tone: 'teal' },
  { label: 'Energy & environment', icon: EnergyIcon, tone: 'teal', top: true },
  { label: 'Agriculture', icon: TractorIcon, tone: 'teal' },
  { label: 'Manufacturing', icon: Factory01Icon, tone: 'amber' },
  { label: 'Construction', icon: Wrench01Icon, tone: 'amber' },
  { label: 'Automotive', icon: Car01Icon, tone: 'amber' },
  { label: 'Aerospace & defense', icon: Airplane01Icon, tone: 'amber' },
  { label: 'Transport & logistics', icon: DeliveryTruck01Icon, tone: 'amber' },
  { label: 'Public sector', icon: Building06Icon, tone: 'slate' },
  { label: 'Legal', icon: Legal01Icon, tone: 'slate' },
  { label: 'HR & staffing', icon: UserGroup02Icon, tone: 'slate' },
  { label: 'Telecom', icon: SmartPhone01Icon, tone: 'slate' },
];

/** Minimum salary: a placeholder distribution above a single-handle slider (0 to 100K, 1K steps), the amount as plain text and a ghost currency dropdown. */
function SalaryMinimum({
  value,
  onValue,
  currency,
  onCurrency,
}: {
  value: number;
  onValue: (next: number) => void;
  currency: string;
  onCurrency: (next: string) => void;
}) {
  const symbol = CURRENCIES.find((c) => c.code === currency)?.symbol ?? '€';
  const perBar = (SALARY_MAX - SALARY_MIN) / SALARY_BARS.length;
  const peak = Math.max(...SALARY_BARS);

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="flex h-20 items-end gap-px px-2" aria-hidden>
        {SALARY_BARS.map((v, i) => {
          const from = SALARY_MIN + i * perBar;
          const inside = from + perBar > value;
          return <div key={i} className={cn('flex-1 rounded-t-[2px]', inside ? 'bg-purple-500' : 'bg-purple-500/20')} style={{ height: `${(v / peak) * 100}%` }} />;
        })}
      </div>
      <Slider
        value={[value]}
        min={SALARY_MIN}
        max={SALARY_MAX}
        step={1}
        onValueChange={(v) => onValue(Array.isArray(v) ? v[0] : v)}
        aria-label="Minimum salary"
        className="mt-3 **:data-[slot=slider-range]:bg-transparent"
      />
      <div className="mt-6 flex items-baseline justify-center gap-2">
        <span className="font-heading text-6xl font-medium tracking-tight tabular-nums">
          {value}
          <span className="text-4xl text-muted-foreground">K{value === SALARY_MAX && '+'}</span>
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger render={<button type="button" aria-label="Currency" className="rounded-xl px-2 text-4xl font-medium text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/30" />}>
            {symbol}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-max min-w-0">
            {CURRENCIES.map((c) => (
              <DropdownMenuItem key={c.code} className="whitespace-nowrap" onClick={() => onCurrency(c.code)}>
                {c.symbol} {c.code}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <span className="text-lg text-muted-foreground">/year</span>
      </div>
    </div>
  );
}

/** Contract types (multi-select) and a yearly salary range with its currency. */
export function ContractStep({
  contracts,
  onContracts,
  minSalary,
  onMinSalary,
  currency,
  onCurrency,
}: {
  contracts: string[];
  onContracts: (next: string[]) => void;
  minSalary: number;
  onMinSalary: (next: number) => void;
  currency: string;
  onCurrency: (next: string) => void;
}) {
  return (
    <>
      <StepHeader title="What kind of contract do you want?" subtitle="Pick the contract types you accept and your minimum yearly salary." />
      <div className="mx-auto flex max-w-2xl flex-wrap justify-center gap-4">
        {CONTRACTS.map((c) => (
          <ChoiceCard key={c} selected={contracts.includes(c)} onClick={() => onContracts(toggle(contracts, c))}>
            <HugeiconsIcon icon={Agreement03Icon} size={18} strokeWidth={1.8} />
            {c}
          </ChoiceCard>
        ))}
      </div>
      <div className="mt-10 border-t pt-10">
        <SalaryMinimum value={minSalary} onValue={onMinSalary} currency={currency} onCurrency={onCurrency} />
      </div>
    </>
  );
}

/** Company size and sectors. Empty means no filter. */
export function CompanyStep({
  sizes,
  onSizes,
  sectors,
  onSectors,
}: {
  sizes: string[];
  onSizes: (next: string[]) => void;
  sectors: string[];
  onSectors: (next: string[]) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  // Same order and same box height in both states: collapsed clips to three full rows, expanded scrolls inside the box, so nothing on the page moves or scrolls.
  const ordered = [...SECTORS.filter((s) => s.top), ...SECTORS.filter((s) => !s.top)];
  return (
    <>
      <StepHeader title="What kind of company suits you?" subtitle="Leave anything empty to keep every option open." />
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-6">
        <div className="flex flex-wrap justify-center gap-4">
          {SIZES.map((s) => (
            <button
              key={s.label}
              type="button"
              aria-pressed={sizes.includes(s.label)}
              onClick={() => onSizes(toggle(sizes, s.label))}
              className={cn(
                'flex h-24 w-32 flex-col items-center justify-center gap-2.5 rounded-xl bg-card text-sm font-medium ring-1 ring-foreground/10 transition-colors outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/30',
                sizes.includes(s.label) && 'bg-muted ring-2 ring-foreground hover:bg-muted',
              )}
            >
              <HugeiconsIcon icon={s.icon} size={26} strokeWidth={1.6} />
              {s.label}
            </button>
          ))}
        </div>
        <div className={cn('flex h-40 w-full flex-wrap content-start justify-center gap-3 border-t p-1 pt-6', showAll ? '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden overflow-y-auto [mask-image:linear-gradient(to_bottom,black_calc(100%-2rem),transparent)] pb-8' : 'overflow-hidden')}>
          {ordered.map((s) => {
            const selected = sectors.includes(s.label);
            return (
              <button
                key={s.label}
                type="button"
                aria-pressed={selected}
                onClick={() => onSectors(toggle(sectors, s.label))}
                className={cn(
                  'flex h-9 items-center gap-2 rounded-full bg-card pr-3.5 pl-1.5 text-sm font-medium ring-1 ring-foreground/10 transition-colors outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/30',
                  selected && 'bg-muted ring-2 ring-foreground hover:bg-muted',
                )}
              >
                <span className={cn('flex size-6 items-center justify-center rounded-full', TONES[s.tone])}>
                  <HugeiconsIcon icon={s.icon} size={14} strokeWidth={2} />
                </span>
                {s.label}
              </button>
            );
          })}
        </div>
        <Button variant="ghost" size="lg" onClick={() => setShowAll(!showAll)}>
          {showAll ? 'See fewer sectors' : 'See more sectors'}
          <HugeiconsIcon icon={showAll ? ArrowUp01Icon : ArrowDown01Icon} size={16} strokeWidth={2} />
        </Button>
      </div>
    </>
  );
}
