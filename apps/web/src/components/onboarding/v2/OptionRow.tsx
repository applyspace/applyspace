'use client';

import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

/** A full-width selectable row: icon, title, description, checkbox. Used one under the other. */
export function OptionRow({
  icon,
  title,
  description,
  selected,
  onSelect,
}: {
  icon: IconSvgElement;
  title: string;
  description: string;
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
        'flex w-full items-center gap-4 rounded-3xl bg-card px-5 py-4 text-left ring-1 ring-foreground/10 transition-colors outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/30',
        selected && 'bg-[#f6eaff] ring-2 ring-[#e2b8ff] hover:bg-[#f6eaff]',
      )}
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-muted">
        <HugeiconsIcon icon={icon} size={22} strokeWidth={1.8} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-medium">{title}</span>
        <span className="block text-sm text-muted-foreground">{description}</span>
      </span>
      <Checkbox checked={selected} tabIndex={-1} aria-hidden className="pointer-events-none size-5" />
    </button>
  );
}
