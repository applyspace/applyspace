import type { Metadata } from 'next';
import { JsonLd } from '@/components/seo/JsonLd';
import { Hero } from '@/components/sections/Hero';
import { SectionRenderer } from '@/components/sections/SectionRenderer';
import { ui } from '@/content/ui';
import { getFeatures, getPage, getPlans } from '@/lib/content';
import { type Locale } from '@/lib/i18n';
import { breadcrumbLd } from '@/lib/jsonld';
import { siteUrl } from '@/lib/links';
import { buildMetadata } from '@/lib/seo';

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const page = await getPage('pricing', locale);
  return buildMetadata({ locale, path: '/pricing', title: page.seo.title, description: page.seo.description, noindex: page.seo.noindex, ogImageUrl: page.seo.ogImageUrl });
}

export default async function PricingPage({ params }: Props) {
  const { locale } = await params;
  const [page, features, plans] = await Promise.all([getPage('pricing', locale), getFeatures(locale), getPlans(locale)]);
  const t = ui[locale];
  return (
    <>
      <JsonLd data={breadcrumbLd([{ name: t.breadcrumbHome, url: siteUrl(locale, '/') }, { name: page.heading, url: siteUrl(locale, '/pricing') }])} />
      <Hero locale={locale} heading={page.heading} intro={page.intro} ctas={page.ctas} />
      <SectionRenderer locale={locale} sections={page.sections} features={features} plans={plans} />
    </>
  );
}
