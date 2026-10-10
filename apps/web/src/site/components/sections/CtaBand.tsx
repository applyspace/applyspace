import { body, h2, wrap } from './styles';
import { CtaButton } from '@/site/components/ui/CtaButton';
import { ProductShot } from '@/site/components/ui/ProductShot';
import type { Section } from '@/site/content/types';
import { cn } from '@/site/lib/cn';
import type { Locale } from '@/site/lib/i18n';

/** Closing band: echoes the hero, one main action, and a faded crop of the hero visual (same file, no extra bytes). */
export function CtaBand({ locale, section }: { locale: Locale; section: Extract<Section, { type: 'cta' }> }) {
  return (
    <section className="mt-20 overflow-hidden border-y border-stone-200 bg-stone-100 sm:mt-32">
      <div className={cn(wrap, 'pt-20 text-center sm:pt-28', !section.shot && 'pb-20 sm:pb-28')}>
        <h2 className={cn(h2, 'mx-auto max-w-[720px]')}>{section.title}</h2>
        {section.text && <p className={cn(body, 'mx-auto mt-4 max-w-xl')}>{section.text}</p>}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <CtaButton cta={section.cta} locale={locale} placement="cta-band-primary" className="w-full sm:w-auto" />
          {section.secondary && <CtaButton cta={section.secondary} locale={locale} placement="cta-band-secondary" variant="secondary" className="w-full sm:w-auto" />}
        </div>
      </div>
      {section.shot && (
        <div aria-hidden className={cn(wrap, 'mt-14 sm:mt-16')}>
          <div className="mx-auto h-[180px] max-w-[960px] overflow-hidden [mask-image:linear-gradient(to_bottom,#000_30%,transparent)] sm:h-[280px]">
            <ProductShot locale={locale} shot={section.shot} sizes="(min-width: 1024px) 960px, 100vw" frameClassName="rounded-b-none border-b-0" />
          </div>
        </div>
      )}
    </section>
  );
}
