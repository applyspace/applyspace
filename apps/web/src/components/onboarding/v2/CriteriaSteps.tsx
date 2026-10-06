'use client';

import { useState } from 'react';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import {
  Agreement03Icon,
  AiBrain01Icon,
  ArrowDown01Icon,
  Building06Icon,
  Car01Icon,
  City01Icon,
  CodeIcon,
  FavouriteIcon,
  Film01Icon,
  GameController01Icon,
  GraduationScrollIcon,
  Home01Icon,
  Legal01Icon,
  Medicine01Icon,
  Megaphone01Icon,
  PaintBrush01Icon,
  Plant01Icon,
  Restaurant01Icon,
  ShoppingCart01Icon,
  Shield01Icon,
  Stethoscope02Icon,
  User02Icon,
  UserGroupIcon,
  Building02Icon,
  Building05Icon,
  Tick02Icon,
  BankIcon,
  Wallet01Icon,
} from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
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
export const SALARY_MAX = 300;

/**
 * Placeholder salary distribution (purely visual for now), one bar per 5K.
 * Two overlapping bumps (junior and senior pay) plus deterministic jitter, so it looks like real data.
 */
const SALARY_BARS = Array.from({ length: 60 }, (_, i) => {
  const x = (i + 0.5) * 5;
  const bump = (mu: number, sigma: number, h: number) => h * Math.exp(-((x - mu) ** 2) / (2 * sigma ** 2));
  const jitter = 0.72 + 0.56 * Math.abs(Math.sin(i * 12.9898 + 4.1) * Math.cos(i * 3.7 + 1.3));
  const roundNumber = x % 50 === 2.5 ? 1.12 : 1; // salaries cluster around round figures
  return Math.max(1.5, (bump(42, 13, 100) + bump(78, 20, 62) + bump(130, 40, 14)) * jitter * roundNumber);
});

const SIZES: { label: string; icon: IconSvgElement }[] = [
  { label: '1-10', icon: User02Icon },
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

/** Sectors, coloured by family: tech blue, finance green, health rose, commerce orange, creative violet, impact teal, industry amber, public slate. */
const SECTORS: { label: string; icon: IconSvgElement; tone: Tone }[] = [
  { label: 'SaaS', icon: CodeIcon, tone: 'blue' },
  { label: 'AI', icon: AiBrain01Icon, tone: 'blue' },
  { label: 'Cybersecurity', icon: Shield01Icon, tone: 'blue' },
  { label: 'Gaming', icon: GameController01Icon, tone: 'blue' },
  { label: 'Fintech', icon: Wallet01Icon, tone: 'emerald' },
  { label: 'Banking', icon: BankIcon, tone: 'emerald' },
  { label: 'Real estate', icon: Home01Icon, tone: 'emerald' },
  { label: 'Healthtech', icon: Stethoscope02Icon, tone: 'rose' },
  { label: 'Biotech', icon: Medicine01Icon, tone: 'rose' },
  { label: 'E-commerce', icon: ShoppingCart01Icon, tone: 'orange' },
  { label: 'Food', icon: Restaurant01Icon, tone: 'orange' },
  { label: 'Media', icon: Film01Icon, tone: 'violet' },
  { label: 'Design', icon: PaintBrush01Icon, tone: 'violet' },
  { label: 'Marketing', icon: Megaphone01Icon, tone: 'violet' },
  { label: 'Climate', icon: Plant01Icon, tone: 'teal' },
  { label: 'Education', icon: GraduationScrollIcon, tone: 'teal' },
  { label: 'Nonprofit', icon: FavouriteIcon, tone: 'teal' },
  { label: 'Automotive', icon: Car01Icon, tone: 'amber' },
  { label: 'Legaltech', icon: Legal01Icon, tone: 'slate' },
  { label: 'Public sector', icon: Building06Icon, tone: 'slate' },
];

/** Editable amount (in K): commits on blur or Enter, clamped to the bounds. */
function AmountInput({ value, min, max, onCommit, label }: { value: number; min: number; max: number; onCommit: (n: number) => void; label: string }) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    const n = Number(draft);
    if (draft !== null && draft.trim() !== '' && Number.isFinite(n)) onCommit(Math.min(max, Math.max(min, Math.round(n))));
    setDraft(null);
  };
  return (
    <Input
      inputMode="numeric"
      aria-label={label}
      value={draft ?? String(value)}
      onChange={(e) => setDraft(e.target.value.replace(/[^\d]/g, ''))}
      onFocus={(e) => e.currentTarget.select()}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      className="h-10 w-16 rounded-xl px-2 text-center text-base font-medium tabular-nums"
    />
  );
}

/** Airbnb-style salary range: a placeholder distribution above a two-thumb slider, editable bounds and a ghost currency dropdown. */
function SalaryRange({
  range,
  onRange,
  currency,
  onCurrency,
}: {
  range: number[];
  onRange: (next: number[]) => void;
  currency: string;
  onCurrency: (next: string) => void;
}) {
  const [lo, hi] = range;
  const symbol = CURRENCIES.find((c) => c.code === currency)?.symbol ?? '€';
  const perBar = (SALARY_MAX - SALARY_MIN) / SALARY_BARS.length;
  const peak = Math.max(...SALARY_BARS);

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="flex h-20 items-end gap-px px-2" aria-hidden>
        {SALARY_BARS.map((v, i) => {
          const from = SALARY_MIN + i * perBar;
          const inside = from + perBar > lo && from < hi;
          return <div key={i} className={cn('flex-1 rounded-t-[2px]', inside ? 'bg-pink-500' : 'bg-pink-500/20')} style={{ height: `${(v / peak) * 100}%` }} />;
        })}
      </div>
      <Slider
        value={range}
        min={SALARY_MIN}
        max={SALARY_MAX}
        step={5}
        minStepsBetweenValues={1}
        onValueChange={(v) => Array.isArray(v) && onRange([...v])}
        aria-label="Salary range"
        className="mt-3 **:data-[slot=slider-range]:bg-pink-500"
      />
      <div className="mt-5 flex items-center justify-center gap-1.5 text-lg font-medium">
        <AmountInput value={lo} min={SALARY_MIN} max={hi - 5} onCommit={(n) => onRange([n, hi])} label="Minimum salary in thousands" />
        <span>K</span>
        <span className="px-1 text-muted-foreground">–</span>
        <AmountInput value={hi} min={lo + 5} max={SALARY_MAX} onCommit={(n) => onRange([lo, n])} label="Maximum salary in thousands" />
        <span>K{hi === SALARY_MAX && '+'}</span>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="sm" className="h-8 gap-0.5 px-1.5 text-lg font-medium" aria-label="Currency" />}>
            {symbol}
            <HugeiconsIcon icon={ArrowDown01Icon} size={12} strokeWidth={2} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="min-w-0">
            {CURRENCIES.map((c) => (
              <DropdownMenuItem key={c.code} onClick={() => onCurrency(c.code)}>
                {c.symbol} {c.code}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <span>/y</span>
      </div>
    </div>
  );
}

/** Contract types (multi-select) and a yearly salary range with its currency. */
export function ContractStep({
  contracts,
  onContracts,
  range,
  onRange,
  currency,
  onCurrency,
}: {
  contracts: string[];
  onContracts: (next: string[]) => void;
  range: number[];
  onRange: (next: number[]) => void;
  currency: string;
  onCurrency: (next: string) => void;
}) {
  return (
    <>
      <StepHeader title="What kind of contract do you want?" subtitle="Pick the contract types you accept and your yearly salary range." />
      <div className="mx-auto flex max-w-2xl flex-wrap justify-center gap-4">
        {CONTRACTS.map((c) => (
          <ChoiceCard key={c} selected={contracts.includes(c)} onClick={() => onContracts(toggle(contracts, c))}>
            <HugeiconsIcon icon={Agreement03Icon} size={18} strokeWidth={1.8} />
            {c}
          </ChoiceCard>
        ))}
      </div>
      <div className="mt-10 border-t pt-10">
        <SalaryRange range={range} onRange={onRange} currency={currency} onCurrency={onCurrency} />
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
        <div className="flex flex-wrap justify-center gap-3 border-t pt-6">
          {SECTORS.map((s) => {
            const selected = sectors.includes(s.label);
            return (
              <button
                key={s.label}
                type="button"
                aria-pressed={selected}
                onClick={() => onSectors(toggle(sectors, s.label))}
                className={cn(
                  'flex h-9 items-center gap-2 rounded-full bg-card pr-2 pl-1.5 text-sm font-medium ring-1 ring-foreground/10 transition-colors outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/30',
                  selected && 'bg-muted ring-2 ring-foreground hover:bg-muted',
                )}
              >
                <span className={cn('flex size-6 items-center justify-center rounded-full', TONES[s.tone])}>
                  <HugeiconsIcon icon={s.icon} size={14} strokeWidth={2} />
                </span>
                {s.label}
                <span
                  className={cn(
                    'flex size-5 items-center justify-center rounded-full bg-foreground text-background transition-all',
                    selected ? 'scale-100 opacity-100' : 'scale-50 opacity-0',
                  )}
                  aria-hidden
                >
                  <HugeiconsIcon icon={Tick02Icon} size={12} strokeWidth={3} />
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
