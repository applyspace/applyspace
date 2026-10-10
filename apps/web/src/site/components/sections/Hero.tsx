import Link from 'next/link';
import { buttonStyles } from '@/site/components/ui/buttonStyles';
import type { Cta } from '@/site/content/types';
import type { Locale } from '@/site/lib/i18n';
import { ctaHref } from '@/site/lib/links';

export function Hero({ locale, heading, intro, ctas, align = 'center', placement = 'hero' }: { locale: Locale; heading: string; intro: string; ctas?: Cta[]; align?: 'center' | 'left'; placement?: string }) {
  return (
    <section className={align === 'center' ? 'mx-auto max-w-3xl px-4 pt-16 text-center sm:px-6 sm:pt-24' : 'mx-auto max-w-6xl px-4 pt-14 sm:px-6 sm:pt-20'}>
      <h1 className="font-display text-balance text-4xl text-stone-950 sm:text-6xl">{heading}</h1>
      <p className={align === 'center' ? 'mx-auto mt-5 max-w-xl text-pretty text-lg text-stone-600' : 'mt-5 max-w-2xl text-pretty text-lg text-stone-600'}>{intro}</p>
      {ctas?.length ? (
        <div className={align === 'center' ? 'mt-8 flex flex-wrap items-center justify-center gap-3' : 'mt-8 flex flex-wrap items-center gap-3'}>
          {ctas.map((cta, i) => {
            const href = ctaHref(cta, locale, `${placement}-${i === 0 ? 'primary' : 'secondary'}`);
            const cls = buttonStyles(i === 0 ? 'primary' : 'secondary', 'lg');
            return cta.kind === 'app' ? (
              <a key={cta.label} href={href} className={cls}>{cta.label}</a>
            ) : (
              <Link key={cta.label} href={href} className={cls}>{cta.label}</Link>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
