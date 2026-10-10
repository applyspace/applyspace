import type { PortableTextBlock } from '@portabletext/react';

export type Cta = { label: string; href: string; kind?: 'app' | 'internal' };

export type Seo = {
  title: string;
  description: string;
  noindex?: boolean;
  /** Sanity image URL, when the editor set one. Otherwise the generated card from /og is used. */
  ogImageUrl?: string;
};

export type ImageRef = { url: string; alt: string; width?: number; height?: number };

export type PlanKey = 'free' | 'plus' | 'max';

export type SiteSettings = {
  siteName: string;
  tagline: string;
  description: string;
  nav: { label: string; href: string }[];
  footerNav: { label: string; href: string }[];
  social: { label: string; url: string }[];
  contactEmail?: string;
};

export type Feature = {
  /** Anchor id on /product. */
  key: string;
  theme: ThemeKey;
  title: string;
  summary: string;
  bullets: string[];
  icon?: string;
  plan: PlanKey;
  soon?: boolean;
  screenshot?: ImageRef;
  screenshotAlt: string;
  order: number;
};

export type ThemeKey = 'start' | 'find' | 'track' | 'prepare' | 'profile' | 'control';

export type PricingPlan = {
  key: PlanKey;
  name: string;
  tagline: string;
  /** Planned monthly price. Shown only when priceVisible. */
  priceMonthly: number;
  currency: 'EUR';
  priceVisible: boolean;
  comingSoon: boolean;
  /** Caps. null means unlimited. */
  caps: { applications: number | null; searchProfiles: number | null; interviewTemplates: number | null };
  intro?: string;
  features: string[];
  ctaLabel: string;
  order: number;
};

export type Section =
  | { type: 'cards'; title: string; intro?: string; items: { title: string; text: string; href?: string; icon?: string }[] }
  | { type: 'steps'; title: string; intro?: string; items: { title: string; text: string }[] }
  | { type: 'text'; title: string; body: string; tone?: 'plain' | 'tinted' }
  | { type: 'faq'; title: string; items: { question: string; answer: string }[] }
  | { type: 'plans'; title?: string; intro?: string; variant: 'compact' | 'full'; note?: string }
  | { type: 'features' }
  | { type: 'cta'; title: string; text?: string; cta: Cta };

export type PageSlug = 'home' | 'product' | 'pricing' | 'resources';

export type PageContent = {
  slug: PageSlug;
  seo: Seo;
  heading: string;
  intro: string;
  ctas?: Cta[];
  sections: Section[];
};

export type Resource = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  publishedAt: string;
  updatedAt?: string;
  author: string;
  cover?: ImageRef;
  body: PortableTextBlock[];
  readingMinutes: number;
  seo?: Partial<Seo>;
};
