import Link from 'next/link';
import { h2, sectionTop, textLink, wrap } from './styles';
import { JsonLd } from '@/site/components/seo/JsonLd';
import type { Section } from '@/site/content/types';
import { cn } from '@/site/lib/cn';
import type { Locale } from '@/site/lib/i18n';
import { faqLd } from '@/site/lib/jsonld';
import { internalHref } from '@/site/lib/links';

/** FAQ as native <details> (keyboard and screen-reader support without JavaScript), plus FAQPage JSON-LD. */
export function Faq({ locale, section }: { locale: Locale; section: Extract<Section, { type: 'faq' }> }) {
  return (
    <section id="faq" className={cn(wrap, sectionTop)}>
      <JsonLd data={faqLd(section.items)} />
      <div className="grid gap-8 lg:grid-cols-12 lg:gap-6">
        <div className="lg:col-span-4">
          <h2 className={h2}>{section.title}</h2>
          {section.link && (
            <p className="mt-6">
              <Link href={internalHref(locale, section.link.href)} className={textLink}>
                {section.link.label}
                <span aria-hidden>→</span>
              </Link>
            </p>
          )}
        </div>
        <div className="divide-y divide-stone-200 border-y border-stone-200 lg:col-span-8">
          {section.items.map((it) => (
            <details key={it.question} className="group">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-6 py-5 text-base font-medium text-stone-950 sm:text-[17px] [&::-webkit-details-marker]:hidden">
                {it.question}
                <span
                  aria-hidden
                  className="relative size-4 shrink-0 text-stone-500 before:absolute before:left-0 before:top-1/2 before:h-[1.6px] before:w-4 before:-translate-y-1/2 before:bg-current after:absolute after:left-1/2 after:top-0 after:h-4 after:w-[1.6px] after:-translate-x-1/2 after:bg-current motion-safe:after:transition-transform motion-safe:after:duration-150 group-open:after:scale-y-0"
                />
              </summary>
              <p className="max-w-[64ch] pb-6 text-pretty leading-[1.6] text-stone-600">{it.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
