import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'md' | 'lg';

/** Same family as the app: pill, near-black primary, stone-outlined secondary. */
export function buttonStyles(variant: Variant = 'primary', size: Size = 'md', className?: string) {
  return cn(
    'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full border border-transparent text-sm font-medium whitespace-nowrap transition-colors active:translate-y-px',
    size === 'md' ? 'h-9 px-4' : 'h-11 px-6 text-base',
    variant === 'primary' && 'bg-stone-950 text-white hover:bg-stone-800',
    variant === 'secondary' && 'border-stone-200 bg-white text-stone-950 hover:bg-stone-50',
    variant === 'ghost' && 'text-stone-700 hover:bg-stone-100',
    className,
  );
}
