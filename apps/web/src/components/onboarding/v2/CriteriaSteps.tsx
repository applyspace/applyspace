'use client';

import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import { useId } from 'react';
import {
  Agreement03Icon,
  AiBrain01Icon,
  Airplane01Icon,
  ArrowDown01Icon,
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
import { RollingText } from '@/components/onboarding/v2/RollingText';
import { FADE_BOTH, FADE_BOTTOM, useOverflow } from '@/components/onboarding/v2/useOverflow';
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
 * Placeholder salary distribution (purely visual for now), one bar per 4K.
 * Two overlapping bumps (junior and senior pay) plus deterministic jitter, so it looks like real data.
 */
const SALARY_BARS = Array.from({ length: 25 }, (_, i) => {
  const x = (i + 0.5) * 4;
  const bump = (mu: number, sigma: number, h: number) => h * Math.exp(-((x - mu) ** 2) / (2 * sigma ** 2));
  const jitter = 0.72 + 0.56 * Math.abs(Math.sin(i * 12.9898 + 4.1) * Math.cos(i * 3.7 + 1.3));
  const roundNumber = i % 5 === 2 ? 1.12 : 1; // salaries cluster around round figures
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

/** Smooth path through the points (midpoint cubic curves), used for both the area and its outline. */
function smoothPath(points: [number, number][]) {
  return points.reduce((d, [x, y], i) => {
    if (i === 0) return `M${x},${y}`;
    const [px, py] = points[i - 1];
    const mx = (px + x) / 2;
    return `${d} C${mx},${py} ${mx},${y} ${x},${y}`;
  }, '');
}

/**
 * Area chart with a gradient fill (placeholder distribution). The part at or above the chosen minimum is
 * drawn stronger, the part below it fainter.
 */
function SalaryArea({ value }: { value: number }) {
  const id = useId();
  const peak = Math.max(...SALARY_BARS);
  const W = 100;
  const H = 48;
  const points: [number, number][] = SALARY_BARS.map((v, i) => [((i + 0.5) / SALARY_BARS.length) * W, H - 2 - (v / peak) * (H - 6)]);
  const line = smoothPath([[0, points[0][1]], ...points, [W, points[points.length - 1][1]]]);
  const area = `${line} L${W},${H} L0,${H} Z`;
  const from = Math.min(Math.max(((value - SALARY_MIN) / (SALARY_MAX - SALARY_MIN)) * W, 0), W);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-12 w-full text-brand-400" aria-hidden>
      <defs>
        <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="currentColor" stopOpacity="0.8" />
          <stop offset="95%" stopColor="currentColor" stopOpacity="0.1" />
        </linearGradient>
        <clipPath id={`${id}-selected`}>
          <rect x={from} y="0" width={W - from} height={H} />
        </clipPath>
      </defs>
      <path d={area} fill={`url(#${id}-fill)`} opacity="0.35" />
      <g clipPath={`url(#${id}-selected)`}>
        <path d={area} fill={`url(#${id}-fill)`} />
        <path d={line} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      </g>
    </svg>
  );
}

/**
 * Minimum yearly salary, in thousands. The amount is an editable field (digits only, no prefilled value, "0K" placeholder)
 * on a light zone, above a placeholder distribution and a single-handle slider (0 to 100K, 1K steps).
 */
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
  const text = value > 0 ? String(value) : '';

  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="mb-6 grid grid-cols-2 font-heading text-3xl leading-none font-medium tracking-tight tabular-nums">
        {/* Currency and amount: right-aligned against the fixed suffix, so they grow to the left only. */}
        <div className="flex items-center justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger render={<button type="button" aria-label="Currency" className="rounded-lg py-1 pl-1 outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/30" />}>
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
          <span className="relative inline-flex">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={text}
              placeholder="0"
              aria-label="Minimum yearly salary, in thousands"
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '').slice(0, 3);
                onValue(digits === '' ? 0 : Number(digits));
              }}
              className="rounded-lg bg-transparent px-1 py-0.5 text-center font-[inherit] tracking-[inherit] text-transparent caret-foreground outline-none placeholder:text-muted-foreground/50 focus-visible:ring-3 focus-visible:ring-ring/30"
              style={{ width: `calc(${Math.max(text.length, 1)}ch + 0.5rem)` }}
            />
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
              <RollingText value={text} fast />
            </span>
          </span>
        </div>
        {/* Fixed suffix: "K", a raised "+" in its own span, then "/year". Never moves with the amount. */}
        <div className="flex items-center justify-start">
          <span className={cn(value === 0 && 'text-muted-foreground/50')}>K</span>
          <span className={cn('-translate-y-1 text-2xl', value === 0 && 'text-muted-foreground/50')}>+</span>
          <span className="ml-2 text-xl font-semibold text-muted-foreground">/year</span>
        </div>
      </div>
      <div className="px-2">
        <SalaryArea value={value} />
      </div>
      <Slider
        value={[Math.min(value, SALARY_MAX)]}
        min={SALARY_MIN}
        max={SALARY_MAX}
        step={1}
        onValueChange={(v) => onValue(Array.isArray(v) ? v[0] : v)}
        aria-label="Minimum salary"
        className="mt-0 **:data-[slot=slider-track]:bg-foreground **:data-[slot=slider-range]:bg-border"
      />
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
  showAll,
  onShowAll,
}: {
  sizes: string[];
  onSizes: (next: string[]) => void;
  sectors: string[];
  onSectors: (next: string[]) => void;
  showAll: boolean;
  onShowAll: (next: boolean) => void;
}) {
  // Collapsed: exactly three full rows of tags (the top sectors first, then the rest fills the third row). "See more" opens the inner scroll, same pattern as the platforms step.
  const ordered = [...SECTORS.filter((s) => s.top), ...SECTORS.filter((s) => !s.top)];
  const list = ordered;
  const { ref: listRef, scrollable, scrolled } = useOverflow<HTMLDivElement>([showAll], 60);
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
        <div className="mt-4 w-full border-t">
        <div
          ref={listRef}
          data-scrollable={scrollable}
          className={cn(
            'flex w-full flex-wrap content-start justify-center gap-3 p-1 pt-10',
            showAll
              ? 'max-h-[max(10rem,calc(72dvh-25rem))] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
              : 'max-h-[11.25rem] overflow-hidden',
            showAll && scrollable && cn('pb-16', scrolled ? FADE_BOTH : FADE_BOTTOM),
          )}
        >
          {list.map((s) => {
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
        </div>
        {!showAll && (
          <div className="mb-8 flex justify-center">
            <Button variant="ghost" size="lg" onClick={() => onShowAll(true)}>
              See more
              <HugeiconsIcon icon={ArrowDown01Icon} size={16} strokeWidth={2} />
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
