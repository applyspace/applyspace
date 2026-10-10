import { SITE_URL } from './env';
import type { Locale } from './i18n';
import { siteUrl } from './links';
import type { Feature, PricingPlan, Resource } from '@/content/types';

type Json = Record<string, unknown>;

export const organizationLd = (): Json => ({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${SITE_URL}/#organization`,
  name: 'applyspace',
  url: SITE_URL,
  logo: `${SITE_URL}/logo.svg`,
});

export const websiteLd = (locale: Locale): Json => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${SITE_URL}/#website`,
  url: siteUrl(locale, '/'),
  name: 'applyspace',
  inLanguage: locale,
  publisher: { '@id': `${SITE_URL}/#organization` },
});

/** Every plan is published as an offer. */
export const softwareApplicationLd = (locale: Locale, features: Feature[], plans: PricingPlan[]): Json => ({
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'applyspace',
  url: siteUrl(locale, '/'),
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web, macOS',
  description: 'Find the right offers, track your applications and prepare your interviews.',
  featureList: features.map((f) => f.title),
  offers: plans.map((p) => ({
    '@type': 'Offer',
    name: p.name,
    price: p.priceMonthly.toFixed(2),
    priceCurrency: p.currency,
    availability: 'https://schema.org/InStock',
    url: siteUrl(locale, '/pricing'),
  })),
  publisher: { '@id': `${SITE_URL}/#organization` },
});

export const faqLd = (items: { question: string; answer: string }[]): Json => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: items.map((i) => ({
    '@type': 'Question',
    name: i.question,
    acceptedAnswer: { '@type': 'Answer', text: i.answer },
  })),
});

export const breadcrumbLd = (items: { name: string; url: string }[]): Json => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: it.url })),
});

export const articleLd = (locale: Locale, r: Resource, imageUrl: string): Json => ({
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: r.title,
  description: r.excerpt,
  image: [imageUrl],
  datePublished: r.publishedAt,
  dateModified: r.updatedAt ?? r.publishedAt,
  author: { '@type': 'Organization', name: r.author },
  publisher: { '@id': `${SITE_URL}/#organization` },
  mainEntityOfPage: siteUrl(locale, `/resources/${r.slug}`),
  inLanguage: locale,
});
