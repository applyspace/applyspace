import { HugeiconsIcon } from '@hugeicons/react';
import { Tick02Icon } from '@hugeicons/core-free-icons';
import { PlanTag, PLAN_STYLES } from '@/components/ui/PlanTag';
import { buttonStyles } from '@/components/ui/buttonStyles';
import type { PricingPlan } from '@/content/types';
import { ui } from '@/content/ui';
import { cn } from '@/lib/cn';
import type { Locale } from '@/lib/i18n';
import { appHref } from '@/lib/links';

const money = (n: number) => (n === 0 ? '€0' : `€${n.toFixed(2)}`);

export function PlanCards({ locale, plans, variant }: { locale: Locale; plans: PricingPlan[]; variant: 'compact' | 'full' }) {
  const t = ui[locale];
  const cap = (n: number | null) => (n === null ? t.unlimited : String(n));

  return (
    <ul className="mx-auto grid max-w-6xl list-none gap-5 px-4 sm:px-6 md:grid-cols-3">
      {plans.map((p) => (
        <li key={p.key} className={cn('flex flex-col rounded-4xl p-7', p.key === 'free' ? 'bg-stone-100' : 'border border-stone-200')}>
          <div className="flex items-center gap-2">
            <PlanTag plan={p.key} label={t.planTag[p.key]} size="lg" />
          </div>
          <p className="mt-3 text-sm text-stone-600">{p.tagline}</p>

          {p.priceVisible && (
            <p className="mt-6 text-4xl font-medium tabular-nums">
              {money(p.priceMonthly)}
              <span className="text-base font-normal text-stone-600">{t.perMonth}</span>
            </p>
          )}

          <ul className="mt-6 space-y-2 text-sm">
            <li className="rounded-xl border border-stone-200 bg-white/70 px-3.5 py-2.5"><strong className="font-semibold">{cap(p.caps.applications)}</strong> {p.caps.applications === 1 ? t.application : t.applications}</li>
            {variant === 'full' && (
              <>
                <li className="rounded-xl border border-stone-200 bg-white/70 px-3.5 py-2.5"><strong className="font-semibold">{cap(p.caps.searchProfiles)}</strong> {p.caps.searchProfiles === 1 ? t.searchProfile : t.searchProfiles}</li>
                <li className="rounded-xl border border-stone-200 bg-white/70 px-3.5 py-2.5"><strong className="font-semibold">{cap(p.caps.interviewTemplates)}</strong> {p.caps.interviewTemplates === 1 ? t.interviewTemplate : t.interviewTemplates}</li>
              </>
            )}
          </ul>

          {variant === 'full' && (
            <div className="mt-6 flex-1">
              {p.intro && <p className="mb-3 text-sm italic text-stone-600">{p.intro}</p>}
              <ul className="space-y-2 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <span className={cn('mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full', PLAN_STYLES[p.key].tag)}>
                      <HugeiconsIcon icon={Tick02Icon} size={12} strokeWidth={2.5} aria-hidden />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {variant === 'full' && (
            <a href={appHref('/login', `pricing-${p.key}`)} className={buttonStyles(p.key === 'free' ? 'primary' : 'secondary', 'lg', 'mt-8 w-full')}>
              {p.ctaLabel}
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}
