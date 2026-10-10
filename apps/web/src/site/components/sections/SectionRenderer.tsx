import Link from 'next/link';
import { CtaBand } from './CtaBand';
import { Facts } from './Facts';
import { Faq } from './Faq';
import { Features } from './Features';
import { Flow } from './Flow';
import { PlanCards } from './PlanCards';
import { Scatter } from './Scatter';
import { Spotlight } from './Spotlight';
import { Steps } from './Steps';
import { Trust } from './Trust';
import { Views } from './Views';
import { body as bodyText, h2 as h2Section, textLink, wrap as wrapWide } from './styles';
import { FeatureIcon } from '@/site/components/ui/icons';
import type { Feature, PricingPlan, Section } from '@/site/content/types';
import { ui } from '@/site/content/ui';
import type { Locale } from '@/site/lib/i18n';
import { internalHref } from '@/site/lib/links';
import { cn } from '@/site/lib/cn';

const wrap = 'mx-auto max-w-6xl px-4 sm:px-6';
const h2 = 'font-display text-balance text-3xl text-stone-950 sm:text-4xl';

/** Numbered figures a section shows (product shots with a caption). */
function figuresIn(s: Section): number {
  switch (s.type) {
    case 'spotlight':
    case 'views':
    case 'flow':
      return 1;
    default:
      return 0;
  }
}

/**
 * Renders the CMS-driven (or fallback) sections of a page, in order. Figures are numbered in page order,
 * starting at `firstFigure` (the homepage hero is Fig. 1).
 */
export function SectionRenderer({
  locale,
  sections,
  features,
  plans,
  firstFigure = 1,
}: {
  locale: Locale;
  sections: Section[];
  features: Feature[];
  plans: PricingPlan[];
  firstFigure?: number;
}) {
  const figures = sections.map((_, i) => firstFigure + sections.slice(0, i).reduce((n, prev) => n + figuresIn(prev), 0));
  return (
    <>
      {sections.map((s, idx) => {
        const figure = figures[idx];
        switch (s.type) {
          case 'cards':
            return (
              <section key={idx} className={cn(wrap, 'pt-20')}>
                <h2 className={h2}>{s.title}</h2>
                {s.intro && <p className="mt-3 max-w-2xl text-stone-600">{s.intro}</p>}
                <ul className="mt-8 grid list-none gap-5 md:grid-cols-3">
                  {s.items.map((it) => {
                    const body = (
                      <>
                        <span className="flex size-10 items-center justify-center rounded-2xl bg-white text-stone-800"><FeatureIcon name={it.icon} /></span>
                        <h3 className="mt-4 text-lg font-semibold tracking-tight">{it.title}</h3>
                        <p className="mt-2 text-sm text-stone-600">{it.text}</p>
                      </>
                    );
                    return (
                      <li key={it.title}>
                        {it.href ? (
                          <Link href={internalHref(locale, it.href)} className="block h-full rounded-4xl bg-stone-100 p-7 transition-colors hover:bg-stone-200/70">{body}</Link>
                        ) : (
                          <div className="h-full rounded-4xl bg-stone-100 p-7">{body}</div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          case 'steps':
            return <Steps key={idx} locale={locale} section={s} />;
          case 'text':
            return (
              <section key={idx} className={cn(wrap, 'pt-20')}>
                <div className={cn('rounded-4xl px-7 py-10 sm:px-12', s.tone === 'tinted' ? 'bg-brand-50' : '')}>
                  <h2 className={h2}>{s.title}</h2>
                  <p className="mt-4 max-w-2xl text-pretty text-stone-700">{s.body}</p>
                </div>
              </section>
            );
          case 'faq':
            return <Faq key={idx} locale={locale} section={s} />;
          case 'plans':
            if (s.variant === 'compact') {
              return (
                <section key={idx} id="pricing" className="pt-20 sm:pt-32">
                  {s.title && (
                    <div data-reveal className={cn(wrapWide, 'mb-10 text-left sm:mb-12 sm:text-center')}>
                      <h2 className={cn(h2Section, 'sm:mx-auto sm:max-w-[720px]')}>{s.title}</h2>
                      {s.intro && <p className={cn(bodyText, 'mt-5 sm:mx-auto sm:max-w-xl')}>{s.intro}</p>}
                    </div>
                  )}
                  <PlanCards locale={locale} plans={plans} variant="compact" />
                  <div className={cn(wrapWide, 'mt-6 flex flex-col gap-1 sm:items-center sm:text-center')}>
                    {s.footnote && <p className="text-sm text-stone-600">{s.footnote}</p>}
                    <Link href={internalHref(locale, '/pricing')} className={textLink}>
                      {ui[locale].comparePlans}
                      <span aria-hidden>→</span>
                    </Link>
                  </div>
                </section>
              );
            }
            return (
              <section key={idx} className="pt-12">
                {s.title && (
                  <div className={cn(wrap, 'mb-8')}>
                    <h2 className={h2}>{s.title}</h2>
                    {s.intro && <p className="mt-3 max-w-2xl text-stone-600">{s.intro}</p>}
                  </div>
                )}
                {s.note && <p className={cn(wrap, 'mb-6 text-sm text-stone-600')}>{s.note}</p>}
                <PlanCards locale={locale} plans={plans} variant={s.variant} />
              </section>
            );
          case 'features':
            return <Features key={idx} locale={locale} features={features} />;
          case 'cta':
            return <CtaBand key={idx} locale={locale} section={s} />;
          case 'scatter':
            return <Scatter key={idx} section={s} />;
          case 'spotlight':
            return <Spotlight key={idx} locale={locale} section={s} figure={figure} />;
          case 'views':
            return <Views key={idx} locale={locale} section={s} figure={figure} />;
          case 'flow':
            return <Flow key={idx} locale={locale} section={s} figure={figure} />;
          case 'trust':
            return <Trust key={idx} locale={locale} section={s} />;
          case 'facts':
            return <Facts key={idx} section={s} />;
        }
      })}
    </>
  );
}
