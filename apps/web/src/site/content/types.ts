import type { PortableTextBlock } from '@portabletext/react';

/** `download` opens the desktop download (NEXT_PUBLIC_DESKTOP_DOWNLOAD_URL), falling back to the sign-in page. */
export type Cta = { label: string; href: string; kind?: 'app' | 'internal' | 'download' };

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
  screenshot?: ImageRef;
  screenshotAlt: string;
  order: number;
};

export type ThemeKey = 'start' | 'find' | 'track' | 'prepare' | 'profile' | 'control';

export type PricingPlan = {
  key: PlanKey;
  name: string;
  tagline: string;
  /** Monthly price. Shown only when priceVisible. */
  priceMonthly: number;
  currency: 'EUR';
  priceVisible: boolean;
  /** Caps. null means unlimited. */
  caps: { applications: number | null; searchProfiles: number | null; interviewTemplates: number | null };
  intro?: string;
  features: string[];
  ctaLabel: string;
  order: number;
};

/** Aspect ratio of a product shot slot. */
export type ShotRatio = '16/10' | '4/3' | '4/5' | '3/2' | '1/1';

/**
 * A product visual slot. The file lives in `apps/web/public/site/shots/<name>.avif` (see docs/website-shots.md);
 * until it exists, a placeholder with the same ratio and alt text is rendered.
 */
export type Shot = {
  /** Slot name, kebab-case: `a1-board`. */
  name: string;
  alt: string;
  ratio: ShotRatio;
  /** Figure caption without the "Fig. N" prefix, which is numbered in page order. */
  caption?: string;
  /** Separate crop for small screens (below 640px). */
  mobile?: { name: string; ratio: ShotRatio };
};

export type TextLink = { label: string; href: string };

export type FragmentKind = 'tab' | 'sheet' | 'note' | 'email' | 'calendar';

export type Section =
  | { type: 'cards'; title: string; intro?: string; items: { title: string; text: string; href?: string; icon?: string }[] }
  | { type: 'steps'; eyebrow?: string; title: string; intro?: string; items: { title: string; text: string; shot?: Shot }[] }
  | { type: 'text'; title: string; body: string; tone?: 'plain' | 'tinted' }
  | { type: 'faq'; title: string; items: { question: string; answer: string }[]; link?: TextLink }
  | { type: 'plans'; title?: string; intro?: string; variant: 'compact' | 'full'; note?: string; footnote?: string }
  | { type: 'features' }
  | { type: 'cta'; title: string; text?: string; cta: Cta; secondary?: Cta; shot?: Shot }
  /** The problem told as a scenario: the scattered tools of one application. */
  | { type: 'scatter'; title: string; body: string; fragments: { kind: FragmentKind; label: string; text: string }[] }
  /** One product space: text on one side, a product shot (and an optional zoomed inset) on the other. */
  | {
      type: 'spotlight';
      anchor?: string;
      eyebrow: string;
      title: string;
      body: string;
      bullets: string[];
      link?: TextLink;
      shot: Shot;
      inset?: Shot;
      /** Side of the shot on large screens. */
      shotSide: 'left' | 'right';
      /** Job boards shown under the shot (logo file if present, name otherwise). */
      boards?: { key: string; name: string }[];
    }
  /** Same data, several views: accessible tabs over one product frame. */
  | { type: 'views'; anchor?: string; eyebrow: string; title: string; intro: string; views: { key: string; label: string; icon?: string; shot: Shot }[] }
  /** Several states of one flow inside a single figure (resume to profile). */
  | { type: 'flow'; anchor?: string; eyebrow: string; title: string; body: string; caption: string; steps: { label: string; shot: Shot }[] }
  /** Trust cards on a tinted band. */
  | { type: 'trust'; title: string; intro?: string; items: { title: string; text: string; icon?: string }[]; link?: TextLink }
  /** Verifiable product facts (no user counts, no quotes). */
  | { type: 'facts'; eyebrow?: string; title: string; items: { value: string; label: string; text?: string }[] };

export type PageSlug = 'home' | 'product' | 'pricing' | 'resources';

export type PageContent = {
  slug: PageSlug;
  seo: Seo;
  heading: string;
  intro: string;
  /** Small line above the H1. */
  eyebrow?: string;
  /** Microcopy under the hero buttons. */
  note?: string;
  ctas?: Cta[];
  /** Product visual right under the hero. */
  heroShot?: Shot;
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
