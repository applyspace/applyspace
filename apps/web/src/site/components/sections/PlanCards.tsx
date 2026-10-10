import { HugeiconsIcon } from '@hugeicons/react';
import { Tick02Icon } from '@hugeicons/core-free-icons';
import { PlanTag, PLAN_STYLES } from '@/site/components/ui/PlanTag';
import { buttonStyles } from '@/site/components/ui/buttonStyles';
import type { PricingPlan } from '@/site/content/types';
import { ui } from '@/site/content/ui';
import { cn } from '@/site/lib/cn';
import type { Locale } from '@/site/lib/i18n';
import { appHref } from '@/site/lib/links';

const money = (n: number) => (n === 0 ? '€0' : `€${n.toFixed(2)}`);

export function PlanCards({ locale, plans, variant }: { locale: Locale; plans: PricingPlan[]; variant: 'compact' | 'full' }) {
  const t = ui[locale];
  const cap = (n: number | null) => (n === null ? t.unlimited : String(n));
  if (variant === 'compact') return <PlanTeaser locale={locale} plans={plans} />;

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

/**
 * Homepage pricing teaser: three cards in the same order on every screen (Free, Plus, Max). Plus carries
 * the lilac tint; no "most chosen" label (no data to back it).
 */
function PlanTeaser({ locale, plans }: { locale: Locale; plans: PricingPlan[] }) {
  const t = ui[locale];
  return (
    <ul className="mx-auto grid max-w-[1248px] list-none gap-4 px-4 sm:px-6 md:grid-cols-3">
      {plans.map((p) => (
        <li
          key={p.key}
          data-reveal
          className={cn('flex flex-col rounded-2xl border p-6 sm:p-7', p.key === 'plus' ? 'border-brand-200 bg-brand-50' : 'border-stone-200 bg-white')}
        >
          <PlanTag plan={p.key} label={t.planTag[p.key]} size="md" className="self-start" />
          {p.priceVisible && (
            <p className="mt-6 text-4xl font-medium tabular-nums tracking-tight text-stone-950">
              {money(p.priceMonthly)}
              {p.priceMonthly > 0 && <span className="text-base font-normal text-stone-600">{t.perMonthLong}</span>}
            </p>
          )}
          <p className="mt-2 text-[15px] text-stone-700">{t.upToApplications(p.caps.applications)}</p>
          <a
            href={appHref('/login', `home-plan-${p.key}`)}
            className={buttonStyles(p.key === 'free' ? 'primary' : 'secondary', 'lg', 'mt-8 w-full')}
          >
            {p.key === 'free' ? t.startPlan : t.choosePlan(p.name)}
          </a>
        </li>
      ))}
    </ul>
  );
}
