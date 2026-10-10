import Link from 'next/link';
import { body, eyebrow, h2, sectionTop, textLink, wrap } from './styles';
import { FeatureIcon } from '@/site/components/ui/icons';
import { ProductShot } from '@/site/components/ui/ProductShot';
import type { Section } from '@/site/content/types';
import { ui } from '@/site/content/ui';
import { cn } from '@/site/lib/cn';
import type { Locale } from '@/site/lib/i18n';
import { internalHref } from '@/site/lib/links';
import { boardLogoSrc } from '@/site/lib/shots';

/**
 * One product space: text (5 columns) beside a product crop (7 columns), alternating sides. An optional
 * zoomed inset shows one control larger; an optional row lists the job boards (Brandfetch logo when the file exists).
 */
export function Spotlight({ locale, section, figure }: { locale: Locale; section: Extract<Section, { type: 'spotlight' }>; figure: number }) {
  const t = ui[locale];
  const shotLeft = section.shotSide === 'left';
  const id = section.anchor ? `h-${section.anchor}` : undefined;

  return (
    <section id={section.anchor} aria-labelledby={id} className={cn(wrap, sectionTop)}>
      <div className="grid gap-10 lg:grid-cols-12 lg:items-center lg:gap-6">
        <div data-reveal className={cn('lg:col-span-5', shotLeft ? 'lg:order-2 lg:col-start-8' : 'lg:pr-6')}>
          <p className={eyebrow}>{section.eyebrow}</p>
          <h2 id={id} className={cn(h2, 'mt-4')}>
            {section.title}
          </h2>
          <p className={cn(body, 'mt-5 max-w-[64ch]')}>{section.body}</p>
          {section.bullets.length > 0 && (
            <ul className="mt-6 space-y-3">
              {section.bullets.map((b) => (
                <li key={b} className="flex items-start gap-3 text-[15px] text-stone-800">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-700">
                    <FeatureIcon name="tick" size={12} />
                  </span>
                  {b}
                </li>
              ))}
            </ul>
          )}
          {section.link && (
            <p className="mt-6">
              <Link href={internalHref(locale, section.link.href)} className={textLink}>
                {section.link.label}
                <span aria-hidden>→</span>
              </Link>
            </p>
          )}
        </div>

        <div className={cn('lg:col-span-7', shotLeft && 'lg:order-1 lg:col-start-1')}>
          <div className="relative">
            <ProductShot locale={locale} shot={section.shot} figure={figure} sizes="(min-width: 1024px) 680px, 100vw" />
            {section.inset && (
              <ProductShot
                locale={locale}
                shot={section.inset}
                sizes="280px"
                className={cn('absolute bottom-14 hidden w-[42%] sm:block', shotLeft ? '-right-4 lg:-right-8' : '-left-4 lg:-left-8')}
                frameClassName="rounded-xl"
              />
            )}
          </div>
          {section.boards?.length ? (
            <ul aria-label={t.jobBoards} className="mt-8 grid list-none grid-cols-2 items-center gap-x-6 gap-y-4 sm:flex sm:flex-wrap sm:gap-x-10">
              {section.boards.map((b) => {
                const logo = boardLogoSrc(b.key);
                return (
                  <li key={b.key} className="flex h-6 items-center">
                    {logo ? (
                      // eslint-disable-next-line @next/next/no-img-element -- small SVG wordmark, no optimisation needed
                      <img src={logo} alt={b.name} height={24} className="h-6 w-auto opacity-70 grayscale" loading="lazy" decoding="async" />
                    ) : (
                      <span className="text-sm font-medium tracking-tight text-stone-500">{b.name}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      </div>
    </section>
  );
}
