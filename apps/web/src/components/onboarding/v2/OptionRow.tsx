'use client';

import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

export type OptionTone = 'amber' | 'sky' | 'stone';

const TONES: Record<OptionTone, { card: string; selected: string; icon: string; check: string }> = {
  amber: { card: 'bg-amber-50 ring-amber-200 hover:bg-amber-100/70', selected: 'bg-amber-100 ring-2 ring-amber-500 hover:bg-amber-100', icon: 'bg-amber-200 text-amber-900', check: 'rounded-full bg-amber-200 data-checked:border-amber-500 data-checked:bg-amber-500 data-checked:text-white dark:data-checked:bg-amber-500' },
  sky: { card: 'bg-sky-50 ring-sky-200 hover:bg-sky-100/70', selected: 'bg-sky-100 ring-2 ring-sky-500 hover:bg-sky-100', icon: 'bg-sky-200 text-sky-900', check: 'rounded-full bg-sky-200 data-checked:border-sky-500 data-checked:bg-sky-500 data-checked:text-white dark:data-checked:bg-sky-500' },
  stone: { card: 'bg-stone-100 ring-stone-200 hover:bg-stone-200/60', selected: 'bg-stone-200 ring-2 ring-stone-500 hover:bg-stone-200', icon: 'bg-stone-300 text-stone-900', check: 'rounded-full bg-stone-300 data-checked:border-stone-500 data-checked:bg-stone-500 data-checked:text-white dark:data-checked:bg-stone-500' },
};

/** A full-width selectable row: icon, title, description, checkbox. Used one under the other. */
export function OptionRow({
  icon,
  title,
  description,
  tone,
  selected,
  onSelect,
}: {
  icon: IconSvgElement;
  title: string;
  description: string;
  tone: OptionTone;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-5 rounded-[2rem] px-7 py-6 text-left ring-1 transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/30',
        selected ? TONES[tone].selected : TONES[tone].card,
      )}
    >
      <span className={cn('flex size-14 shrink-0 items-center justify-center rounded-2xl', TONES[tone].icon)}>
        <HugeiconsIcon icon={icon} size={28} strokeWidth={1.8} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xl font-medium">{title}</span>
        <span className="block text-base text-muted-foreground">{description}</span>
      </span>
      <Checkbox checked={selected} tabIndex={-1} aria-hidden className={cn('pointer-events-none size-6', TONES[tone].check)} />
    </button>
  );
}
