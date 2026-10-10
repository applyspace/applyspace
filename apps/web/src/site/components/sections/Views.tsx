import { body, eyebrow, h2, sectionTop, wrap } from './styles';
import { FeatureIcon } from '@/site/components/ui/icons';
import { ProductShot } from '@/site/components/ui/ProductShot';
import { ViewTabs } from '@/site/components/ui/ViewTabs';
import type { Section } from '@/site/content/types';
import { cn } from '@/site/lib/cn';
import type { Locale } from '@/site/lib/i18n';

/** The applications hub: one frame, four views of the same data behind accessible tabs (small client island). */
export function Views({ locale, section, figure }: { locale: Locale; section: Extract<Section, { type: 'views' }>; figure: number }) {
  const key = section.anchor ?? 'views';
  return (
    <section id={section.anchor} aria-labelledby={`h-${key}`} className={cn(wrap, sectionTop)}>
      <div data-reveal className="max-w-[720px] sm:mx-auto sm:text-center">
        <p className={eyebrow}>{section.eyebrow}</p>
        <h2 id={`h-${key}`} className={cn(h2, 'mt-4')}>
          {section.title}
        </h2>
        <p className={cn(body, 'mt-5')}>{section.intro}</p>
      </div>
      <div className="mx-auto mt-10 max-w-[1120px] sm:mt-12">
        <ViewTabs
          id={key}
          label={section.title}
          tabs={section.views.map((v) => ({
            key: v.key,
            label: (
              <>
                <FeatureIcon name={v.icon} size={18} />
                {v.label}
              </>
            ),
          }))}
          panels={section.views.map((v) => (
            <ProductShot key={v.key} locale={locale} shot={v.shot} figure={figure} />
          ))}
        />
      </div>
    </section>
  );
}
