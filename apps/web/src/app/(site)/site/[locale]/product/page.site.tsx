import type { Metadata } from 'next';
import { JsonLd } from '@/site/components/seo/JsonLd';
import { Hero } from '@/site/components/sections/Hero';
import { SectionRenderer } from '@/site/components/sections/SectionRenderer';
import { ui } from '@/site/content/ui';
import { getFeatures, getPage, getPlans } from '@/site/lib/content';
import { type Locale } from '@/site/lib/i18n';
import { breadcrumbLd, softwareApplicationLd } from '@/site/lib/jsonld';
import { siteUrl } from '@/site/lib/links';
import { buildMetadata } from '@/site/lib/seo';

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const page = await getPage('product', locale);
  return buildMetadata({ locale, path: '/product', title: page.seo.title, description: page.seo.description, noindex: page.seo.noindex, ogImageUrl: page.seo.ogImageUrl });
}

export default async function ProductPage({ params }: Props) {
  const { locale } = await params;
  const [page, features, plans] = await Promise.all([getPage('product', locale), getFeatures(locale), getPlans(locale)]);
  const t = ui[locale];
  return (
    <>
      <JsonLd data={[softwareApplicationLd(locale, features, plans), breadcrumbLd([{ name: t.breadcrumbHome, url: siteUrl(locale, '/') }, { name: page.heading, url: siteUrl(locale, '/product') }])]} />
      <Hero locale={locale} heading={page.heading} intro={page.intro} ctas={page.ctas} align="left" />
      <SectionRenderer locale={locale} sections={page.sections} features={features} plans={plans} />
    </>
  );
}
