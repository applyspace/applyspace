import { cn } from '@/site/lib/cn';
import type { PlanKey } from '@/site/content/types';

export const PLAN_STYLES: Record<PlanKey, { tag: string; tint: string }> = {
  free: { tag: 'bg-sky-200 text-sky-950', tint: 'bg-sky-50' },
  plus: { tag: 'bg-brand-300 text-brand-950', tint: 'bg-brand-50' },
  max: { tag: 'bg-red-200 text-red-950', tint: 'bg-red-50' },
};

/** Plan name as a coloured tag: Free sky, Plus brand, Max red (same as the app's plan screen). */
export function PlanTag({ plan, label, size = 'md', className }: { plan: PlanKey; label: string; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-semibold tracking-tight',
        PLAN_STYLES[plan].tag,
        size === 'sm' && 'px-2.5 py-0.5 text-xs',
        size === 'md' && 'px-4 py-1 text-lg',
        size === 'lg' && 'px-5 py-1.5 text-2xl',
        className,
      )}
    >
      {label}
    </span>
  );
}
