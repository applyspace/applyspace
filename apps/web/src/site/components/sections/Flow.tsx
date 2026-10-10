import { body, eyebrow, h2, sectionTop, wrap } from './styles';
import { ProductShot } from '@/site/components/ui/ProductShot';
import type { Section } from '@/site/content/types';
import { ui } from '@/site/content/ui';
import { cn } from '@/site/lib/cn';
import type { Locale } from '@/site/lib/i18n';

/** Several states of one flow in a single bordered figure: horizontal strip on desktop, stacked with a connector on phones. */
export function Flow({ locale, section, figure }: { locale: Locale; section: Extract<Section, { type: 'flow' }>; figure: number }) {
  const t = ui[locale];
  const key = section.anchor ?? 'flow';
  return (
    <section id={section.anchor} aria-labelledby={`h-${key}`} className={cn(wrap, sectionTop)}>
      <div data-reveal className="max-w-[720px]">
        <p className={eyebrow}>{section.eyebrow}</p>
        <h2 id={`h-${key}`} className={cn(h2, 'mt-4')}>
          {section.title}
        </h2>
        <p className={cn(body, 'mt-5')}>{section.body}</p>
      </div>
      <figure className="mt-10 sm:mt-12">
        <ol className="grid list-none gap-0 rounded-2xl border border-stone-200 bg-stone-50 p-4 sm:grid-cols-3 sm:gap-4 sm:p-6">
          {section.steps.map((step, i) => (
            <li
              key={step.label}
              data-reveal
              style={{ '--reveal-step': i } as React.CSSProperties}
              className={cn('relative min-w-0', i > 0 && 'pt-8 sm:pt-0')}
            >
              {i > 0 && <span aria-hidden className="absolute left-5 top-0 h-8 border-l border-stone-300 sm:hidden" />}
              <p className="mb-3 flex items-center gap-2 text-sm font-medium text-stone-800">
                <span className="font-display flex size-7 items-center justify-center rounded-full border border-stone-300 bg-white text-sm text-brand-700">{i + 1}</span>
                {step.label}
              </p>
              <ProductShot locale={locale} shot={step.shot} sizes="(min-width: 640px) 360px, 100vw" frameClassName="rounded-xl" />
            </li>
          ))}
        </ol>
        <figcaption className="mt-3 text-[13px] leading-snug text-stone-600">
          {t.figure} {figure} - {section.caption}
        </figcaption>
      </figure>
    </section>
  );
}
