'use client';

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
  UserMultiple02Icon,
  Building04Icon,
  BankIcon,
  Wallet01Icon,
} from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Slider } from '@/components/ui/slider';
import { ChoiceCard, toggle } from '@/components/onboarding/v2/fields';
import { Flag, type FlagCode } from '@/components/onboarding/v2/flags';
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

/** Placeholder salary distribution (purely visual for now), one bar per 10K. */
const SALARY_BARS = [2, 4, 7, 12, 22, 34, 46, 58, 64, 60, 52, 44, 36, 30, 24, 19, 15, 12, 9, 8, 6, 5, 4, 4, 3, 3, 2, 2, 2, 3];

const SIZES: { label: string; icon: IconSvgElement }[] = [
  { label: '1-10', icon: User02Icon },
  { label: '11-50', icon: UserGroupIcon },
  { label: '51-200', icon: UserMultiple02Icon },
  { label: '201-1,000', icon: Building04Icon },
  { label: '1,000+', icon: City01Icon },
];

const LANGUAGES: { label: string; flag: FlagCode }[] = [
  { label: 'English', flag: 'en' },
  { label: 'French', flag: 'fr' },
  { label: 'German', flag: 'de' },
  { label: 'Spanish', flag: 'es' },
  { label: 'Italian', flag: 'it' },
  { label: 'Portuguese', flag: 'pt' },
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

/** Airbnb-style salary range: a placeholder distribution above a two-thumb slider, with a ghost currency dropdown. */
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
      <div className="flex h-20 items-end gap-0.5 px-2" aria-hidden>
        {SALARY_BARS.map((v, i) => {
          const from = SALARY_MIN + i * perBar;
          const inside = from + perBar > lo && from < hi;
          return <div key={i} className={cn('flex-1 rounded-t-sm', inside ? 'bg-foreground' : 'bg-foreground/15')} style={{ height: `${(v / peak) * 100}%` }} />;
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
        className="mt-3"
      />
      <div className="mt-5 flex items-center justify-center gap-1 text-lg font-medium tabular-nums">
        <span>
          {lo}K – {hi === SALARY_MAX ? `${SALARY_MAX}K+` : `${hi}K`}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="sm" className="gap-1 px-2 text-lg font-medium" aria-label="Currency" />}>
            {symbol}
            <HugeiconsIcon icon={ArrowDown01Icon} size={14} strokeWidth={2} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center">
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

/** Company size, languages and sectors. Empty means no filter. */
export function CompanyStep({
  sizes,
  onSizes,
  languages,
  onLanguages,
  sectors,
  onSectors,
}: {
  sizes: string[];
  onSizes: (next: string[]) => void;
  languages: string[];
  onLanguages: (next: string[]) => void;
  sectors: string[];
  onSectors: (next: string[]) => void;
}) {
  return (
    <>
      <StepHeader title="What kind of company suits you?" subtitle="Leave anything empty to keep every option open." />
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-6">
        <div className="flex flex-wrap justify-center gap-4">
          {SIZES.map((s) => (
            <ChoiceCard key={s.label} selected={sizes.includes(s.label)} onClick={() => onSizes(toggle(sizes, s.label))}>
              <HugeiconsIcon icon={s.icon} size={18} strokeWidth={1.8} />
              {s.label}
            </ChoiceCard>
          ))}
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          {LANGUAGES.map((l) => (
            <ChoiceCard key={l.label} selected={languages.includes(l.label)} onClick={() => onLanguages(toggle(languages, l.label))}>
              <Flag code={l.flag} />
              {l.label}
            </ChoiceCard>
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
    </>
  );
}
