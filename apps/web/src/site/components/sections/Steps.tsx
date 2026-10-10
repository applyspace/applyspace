import { body, eyebrow, h2, h3, sectionTop, wrap } from './styles';
import { ProductShot } from '@/site/components/ui/ProductShot';
import type { Section } from '@/site/content/types';
import { cn } from '@/site/lib/cn';
import type { Locale } from '@/site/lib/i18n';

const COLS: Record<number, string> = { 2: 'md:grid-cols-2', 3: 'md:grid-cols-3', 4: 'md:grid-cols-2 lg:grid-cols-4' };

/** The lifecycle in steps: Fraunces numbers joined by a thin rule; a vertical list with a left rule on phones. */
export function Steps({ locale, section }: { locale: Locale; section: Extract<Section, { type: 'steps' }> }) {
  return (
    <section className={cn(wrap, sectionTop)}>
      <div data-reveal className="max-w-[720px]">
        {section.eyebrow && <p className={cn(eyebrow, 'mb-4')}>{section.eyebrow}</p>}
        <h2 className={h2}>{section.title}</h2>
        {section.intro && <p className={cn(body, 'mt-5')}>{section.intro}</p>}
      </div>
      <ol className={cn('mt-10 grid list-none gap-x-6 gap-y-10 border-l border-stone-200 pl-6 sm:mt-12 md:border-l-0 md:pl-0', COLS[section.items.length] ?? 'md:grid-cols-3')}>
        {section.items.map((it, i) => (
          <li key={it.title} data-reveal style={{ '--reveal-step': i } as React.CSSProperties} className="min-w-0">
            <div className="flex items-center gap-4">
              <span className="font-display text-[44px] leading-none text-brand-600">{i + 1}</span>
              <span aria-hidden className="hidden h-px flex-1 bg-stone-200 md:block" />
            </div>
            <h3 className={cn(h3, 'mt-4')}>{it.title}</h3>
            <p className="mt-2 text-pretty text-[15px] leading-[1.6] text-stone-600">{it.text}</p>
            {it.shot && <ProductShot locale={locale} shot={it.shot} sizes="(min-width: 1024px) 280px, (min-width: 768px) 45vw, 100vw" className="mt-5" frameClassName="rounded-xl" />}
          </li>
        ))}
      </ol>
    </section>
  );
}
