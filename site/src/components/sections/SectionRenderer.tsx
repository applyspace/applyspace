import Link from 'next/link';
import { Features } from './Features';
import { PlanCards } from './PlanCards';
import { FeatureIcon } from '@/components/ui/icons';
import { buttonStyles } from '@/components/ui/buttonStyles';
import { JsonLd } from '@/components/seo/JsonLd';
import type { Feature, PricingPlan, Section } from '@/content/types';
import { ui } from '@/content/ui';
import type { Locale } from '@/lib/i18n';
import { ctaHref, internalHref } from '@/lib/links';
import { faqLd } from '@/lib/jsonld';
import { cn } from '@/lib/cn';

const wrap = 'mx-auto max-w-6xl px-4 sm:px-6';
const h2 = 'font-display text-balance text-3xl text-stone-950 sm:text-4xl';

/** Renders the CMS-driven (or fallback) sections of a page, in order. */
export function SectionRenderer({ locale, sections, features, plans }: { locale: Locale; sections: Section[]; features: Feature[]; plans: PricingPlan[] }) {
  return (
    <>
      {sections.map((s, idx) => {
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
            return (
              <section key={idx} className={cn(wrap, 'pt-20')}>
                <h2 className={h2}>{s.title}</h2>
                <ol className="mt-8 grid list-none gap-8 md:grid-cols-3">
                  {s.items.map((it, i) => (
                    <li key={it.title}>
                      <span className="flex size-8 items-center justify-center rounded-full bg-brand-300 text-sm font-semibold text-brand-950">{i + 1}</span>
                      <h3 className="mt-4 text-lg font-semibold tracking-tight">{it.title}</h3>
                      <p className="mt-2 text-sm text-stone-600">{it.text}</p>
                    </li>
                  ))}
                </ol>
              </section>
            );
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
            return (
              <section key={idx} className={cn(wrap, 'pt-20')}>
                <JsonLd data={faqLd(s.items)} />
                <h2 className={h2}>{s.title}</h2>
                <dl className="mt-8 max-w-3xl divide-y divide-stone-200 border-y border-stone-200">
                  {s.items.map((it) => (
                    <div key={it.question} className="py-5">
                      <dt className="font-semibold">{it.question}</dt>
                      <dd className="mt-2 text-stone-600">{it.answer}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            );
          case 'plans':
            return (
              <section key={idx} className={s.variant === 'full' ? 'pt-12' : 'pt-20'}>
                {s.title && (
                  <div className={cn(wrap, 'mb-8')}>
                    <h2 className={h2}>{s.title}</h2>
                    {s.intro && <p className="mt-3 max-w-2xl text-stone-600">{s.intro}</p>}
                  </div>
                )}
                {s.note && <p className={cn(wrap, 'mb-6 text-sm text-stone-600')}>{s.note}</p>}
                <PlanCards locale={locale} plans={plans} variant={s.variant} />
                {s.variant === 'compact' && (
                  <p className={cn(wrap, 'mt-6')}>
                    <Link href={internalHref(locale, '/pricing')} className="text-sm font-medium underline underline-offset-4">{ui[locale].comparePlans}</Link>
                  </p>
                )}
              </section>
            );
          case 'features':
            return <Features key={idx} locale={locale} features={features} />;
          case 'cta':
            return (
              <section key={idx} className={cn(wrap, 'pt-24')}>
                <div className="rounded-4xl bg-brand-50 px-6 py-14 text-center sm:px-12">
                  <h2 className={cn(h2, 'mx-auto max-w-2xl')}>{s.title}</h2>
                  {s.text && <p className="mx-auto mt-3 max-w-xl text-stone-600">{s.text}</p>}
                  <a href={ctaHref(s.cta, locale, 'cta-band')} className={buttonStyles('primary', 'lg', 'mt-8')}>{s.cta.label}</a>
                </div>
              </section>
            );
        }
      })}
    </>
  );
}
