import Link from 'next/link';
import { band, body, h2, h3, textLink, wrap } from './styles';
import { FeatureIcon } from '@/site/components/ui/icons';
import type { Section } from '@/site/content/types';
import { cn } from '@/site/lib/cn';
import type { Locale } from '@/site/lib/i18n';
import { internalHref } from '@/site/lib/links';

/** Privacy and control: concrete cards on a stone band. Every claim must be true in the product. */
export function Trust({ locale, section }: { locale: Locale; section: Extract<Section, { type: 'trust' }> }) {
  return (
    <section className={band}>
      <div className={wrap}>
        <div data-reveal className="max-w-[720px]">
          <h2 className={h2}>{section.title}</h2>
          {section.intro && <p className={cn(body, 'mt-5')}>{section.intro}</p>}
        </div>
        <ul className="mt-10 grid list-none gap-4 sm:mt-12 sm:grid-cols-2 xl:grid-cols-4">
          {section.items.map((it, i) => (
            <li key={it.title} data-reveal style={{ '--reveal-step': i } as React.CSSProperties} className="rounded-2xl border border-stone-200 bg-white p-6">
              <span className="flex size-10 items-center justify-center rounded-xl bg-stone-100 text-stone-800">
                <FeatureIcon name={it.icon} size={20} />
              </span>
              <h3 className={cn(h3, 'mt-5 text-lg sm:text-lg')}>{it.title}</h3>
              <p className="mt-2 text-pretty text-[15px] leading-[1.6] text-stone-600">{it.text}</p>
            </li>
          ))}
        </ul>
        {section.link && (
          <p className="mt-8">
            <Link href={internalHref(locale, section.link.href)} className={textLink}>
              {section.link.label}
              <span aria-hidden>→</span>
            </Link>
          </p>
        )}
      </div>
    </section>
  );
}
