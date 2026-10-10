import type { Metadata } from 'next';
import { JsonLd } from '@/components/seo/JsonLd';
import { Hero } from '@/components/sections/Hero';
import { SectionRenderer } from '@/components/sections/SectionRenderer';
import { ScreenshotPlaceholder } from '@/components/ui/ScreenshotPlaceholder';
import { ui } from '@/content/ui';
import { getFeatures, getPage, getPlans } from '@/lib/content';
import { type Locale } from '@/lib/i18n';
import { softwareApplicationLd } from '@/lib/jsonld';
import { buildMetadata } from '@/lib/seo';

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const page = await getPage('home', locale);
  return buildMetadata({ locale, path: '/', title: page.seo.title, description: page.seo.description, absoluteTitle: true, noindex: page.seo.noindex, ogImageUrl: page.seo.ogImageUrl });
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  const [page, features, plans] = await Promise.all([getPage('home', locale), getFeatures(locale), getPlans(locale)]);
  const t = ui[locale];

  return (
    <>
      <JsonLd data={softwareApplicationLd(locale, features, plans)} />
      <Hero locale={locale} heading={page.heading} intro={page.intro} ctas={page.ctas} placement="home-hero" />
      <div className="mx-auto mt-14 max-w-5xl px-4 sm:px-6">
        <ScreenshotPlaceholder
          priority
          alt="The applyspace applications board with one column per status"
          label={`${t.screenshotLabel}: Applications board`}
          className="rounded-4xl"
        />
      </div>
      <SectionRenderer locale={locale} sections={page.sections} features={features} plans={plans} />
    </>
  );
}
