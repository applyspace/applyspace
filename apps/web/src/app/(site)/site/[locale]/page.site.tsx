import type { Metadata } from 'next';
import { JsonLd } from '@/site/components/seo/JsonLd';
import { HomeHero } from '@/site/components/sections/Hero';
import { SectionRenderer } from '@/site/components/sections/SectionRenderer';
import { RevealObserver } from '@/site/components/ui/RevealObserver';
import { getFeatures, getPage, getPlans } from '@/site/lib/content';
import { type Locale } from '@/site/lib/i18n';
import { softwareApplicationLd } from '@/site/lib/jsonld';
import { buildMetadata } from '@/site/lib/seo';

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const page = await getPage('home', locale);
  return buildMetadata({ locale, path: '/', title: page.seo.title, description: page.seo.description, absoluteTitle: true, noindex: page.seo.noindex, ogImageUrl: page.seo.ogImageUrl });
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  const [page, features, plans] = await Promise.all([getPage('home', locale), getFeatures(locale), getPlans(locale)]);

  return (
    <>
      <JsonLd data={softwareApplicationLd(locale, features, plans)} />
      <HomeHero locale={locale} eyebrow={page.eyebrow} heading={page.heading} intro={page.intro} ctas={page.ctas} note={page.note} shot={page.heroShot} />
      <SectionRenderer locale={locale} sections={page.sections} features={features} plans={plans} firstFigure={page.heroShot ? 2 : 1} />
      <RevealObserver />
    </>
  );
}
