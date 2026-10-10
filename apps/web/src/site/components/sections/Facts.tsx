import { eyebrow, h2, sectionTop, wrap } from './styles';
import type { Section } from '@/site/content/types';
import { cn } from '@/site/lib/cn';

/** Product facts band: verifiable numbers about the product, never user counts, quotes or logos. */
export function Facts({ section }: { section: Extract<Section, { type: 'facts' }> }) {
  return (
    <section className={cn(wrap, sectionTop)}>
      <div data-reveal className="max-w-[720px]">
        {section.eyebrow && <p className={cn(eyebrow, 'mb-4')}>{section.eyebrow}</p>}
        <h2 className={h2}>{section.title}</h2>
      </div>
      <dl className="mt-10 grid border-y border-stone-200 sm:mt-12 sm:grid-cols-2 lg:grid-cols-4">
        {section.items.map((it, i) => (
          <div
            key={it.label}
            data-reveal
            style={{ '--reveal-step': i } as React.CSSProperties}
            className={cn(
              'flex flex-col py-8 sm:px-6',
              i > 0 && 'border-t border-stone-200 sm:border-t-0',
              i % 2 === 1 && 'sm:border-l sm:border-stone-200',
              i >= 2 && 'sm:border-t sm:border-stone-200 lg:border-t-0',
              i === 2 && 'lg:border-l lg:border-stone-200',
              i % 2 === 0 && 'sm:pl-0',
              i === 2 && 'lg:pl-6',
            )}
          >
            <dt className="order-2 mt-3 font-medium text-stone-950">{it.label}</dt>
            <dd className="font-display order-1 text-[44px] leading-none text-stone-950 sm:text-[56px]">{it.value}</dd>
            {it.text && <dd className="order-3 mt-1.5 text-pretty text-sm leading-[1.6] text-stone-600">{it.text}</dd>}
          </div>
        ))}
      </dl>
    </section>
  );
}
