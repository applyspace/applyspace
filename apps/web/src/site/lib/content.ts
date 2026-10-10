import type { Locale } from './i18n';
import { sanityFetch, sanityImageUrl } from './sanity';
import * as fallback from '@/site/content/fallback';
import type { Cta, Feature, ImageRef, PageContent, PageSlug, PricingPlan, Resource, Section, Shot, ShotRatio, SiteSettings, TextLink } from '@/site/content/types';
import type { PortableTextBlock } from '@portabletext/react';

/**
 * Content access layer. Every function reads Sanity when the env vars are set and the dataset has the document,
 * and otherwise returns the local fallback, so the site always builds and renders.
 * `locale` is passed through for the day Sanity documents carry a `language` field; only `en` exists today.
 */

type SanityImage = { asset?: { _ref?: string }; alt?: string; _type?: string } | null;

function toImage(img: SanityImage, fallbackAlt = ''): ImageRef | undefined {
  if (!img?.asset) return undefined;
  const url = sanityImageUrl(img);
  if (!url) return undefined;
  return { url, alt: img.alt || fallbackAlt };
}

const SETTINGS_QUERY = `*[_type == "siteSettings" && language == $locale][0]{
  siteName, tagline, description, nav[]{label, href}, footerNav[]{label, href}, social[]{label, url}, contactEmail
}`;

export async function getSiteSettings(locale: Locale): Promise<SiteSettings> {
  const doc = await sanityFetch<Partial<SiteSettings> | null>(SETTINGS_QUERY, { locale });
  if (!doc?.siteName) return fallback.settings;
  return {
    ...fallback.settings,
    ...doc,
    nav: doc.nav?.length ? doc.nav : fallback.settings.nav,
    footerNav: doc.footerNav?.length ? doc.footerNav : fallback.settings.footerNav,
    social: doc.social ?? [],
  };
}

const PAGE_QUERY = `*[_type == "page" && slug == $slug && language == $locale][0]{
  "slug": slug,
  "seo": {"title": seoTitle, "description": seoDescription, "noindex": noindex, "ogImage": ogImage},
  heading, intro, eyebrow, note, heroShot, ctas[]{label, href, kind},
  sections[]{
    ...,
    _type == "cardsSection" => {items[]{title, text, href, icon}},
    _type == "stepsSection" => {items[]{title, text}},
    _type == "faqSection" => {items[]{question, answer}}
  }
}`;

/** Raw section as stored in Sanity (`...` projection); mapped and validated below. */
type SanitySection = {
  _type: string;
  anchor?: string;
  eyebrow?: string;
  title?: string;
  intro?: string;
  body?: string;
  tone?: 'plain' | 'tinted';
  variant?: 'compact' | 'full';
  note?: string;
  footnote?: string;
  text?: string;
  caption?: string;
  shotSide?: 'left' | 'right';
  cta?: Cta;
  secondary?: Cta;
  link?: TextLink;
  shot?: SanityShot;
  inset?: SanityShot;
  bullets?: string[];
  boards?: { key?: string; name?: string }[];
  fragments?: { kind?: string; label?: string; text?: string }[];
  views?: { key?: string; label?: string; icon?: string; shot?: SanityShot }[];
  steps?: { label?: string; shot?: SanityShot }[];
  items?: never[];
};

type SanityShot = { name?: string; alt?: string; ratio?: string; caption?: string; mobileName?: string; mobileRatio?: string } | null | undefined;

const RATIOS: ShotRatio[] = ['16/10', '4/3', '4/5', '3/2', '1/1'];
const asRatio = (r: string | undefined, fallbackRatio: ShotRatio): ShotRatio => (RATIOS.includes(r as ShotRatio) ? (r as ShotRatio) : fallbackRatio);

function toShot(s: SanityShot): Shot | undefined {
  if (!s?.name) return undefined;
  return {
    name: s.name,
    alt: s.alt ?? '',
    ratio: asRatio(s.ratio, '16/10'),
    caption: s.caption || undefined,
    mobile: s.mobileName ? { name: s.mobileName, ratio: asRatio(s.mobileRatio, '4/5') } : undefined,
  };
}

const FRAGMENT_KINDS = ['tab', 'sheet', 'note', 'email', 'calendar'] as const;
const nonEmpty = <T>(xs: (T | undefined | null)[] | undefined): T[] => (xs ?? []).filter((x): x is T => x != null);
const link = (l?: TextLink): TextLink | undefined => (l?.label && l?.href ? l : undefined);

function mapSection(s: SanitySection): Section | null {
  switch (s._type) {
    case 'cardsSection':
      return { type: 'cards', title: s.title ?? '', intro: s.intro, items: (s.items ?? []) as never };
    case 'stepsSection':
      return { type: 'steps', eyebrow: s.eyebrow, title: s.title ?? '', intro: s.intro, items: (s.items ?? []) as never };
    case 'textSection':
      return { type: 'text', title: s.title ?? '', body: s.body ?? '', tone: s.tone };
    case 'faqSection':
      return { type: 'faq', title: s.title ?? '', items: (s.items ?? []) as never, link: link(s.link) };
    case 'plansSection':
      return { type: 'plans', title: s.title, intro: s.intro, variant: s.variant ?? 'full', note: s.note, footnote: s.footnote };
    case 'featuresSection':
      return { type: 'features' };
    case 'ctaSection':
      return s.cta ? { type: 'cta', title: s.title ?? '', text: s.text, cta: s.cta, secondary: s.secondary?.label ? s.secondary : undefined, shot: toShot(s.shot) } : null;
    case 'scatterSection':
      return {
        type: 'scatter',
        title: s.title ?? '',
        body: s.body ?? '',
        fragments: nonEmpty(s.fragments).map((f) => ({
          kind: FRAGMENT_KINDS.includes(f.kind as (typeof FRAGMENT_KINDS)[number]) ? (f.kind as (typeof FRAGMENT_KINDS)[number]) : 'note',
          label: f.label ?? '',
          text: f.text ?? '',
        })),
      };
    case 'spotlightSection': {
      const shot = toShot(s.shot);
      if (!shot) return null;
      return {
        type: 'spotlight',
        anchor: s.anchor,
        eyebrow: s.eyebrow ?? '',
        title: s.title ?? '',
        body: s.body ?? '',
        bullets: s.bullets ?? [],
        link: link(s.link),
        shot,
        inset: toShot(s.inset),
        shotSide: s.shotSide === 'left' ? 'left' : 'right',
        boards: nonEmpty(s.boards).flatMap((b) => (b.key && b.name ? [{ key: b.key, name: b.name }] : [])),
      };
    }
    case 'viewsSection': {
      const views = nonEmpty(s.views).flatMap((v) => {
        const shot = toShot(v.shot);
        return v.key && v.label && shot ? [{ key: v.key, label: v.label, icon: v.icon, shot }] : [];
      });
      return views.length ? { type: 'views', anchor: s.anchor, eyebrow: s.eyebrow ?? '', title: s.title ?? '', intro: s.intro ?? '', views } : null;
    }
    case 'flowSection': {
      const steps = nonEmpty(s.steps).flatMap((st) => {
        const shot = toShot(st.shot);
        return st.label && shot ? [{ label: st.label, shot }] : [];
      });
      return steps.length ? { type: 'flow', anchor: s.anchor, eyebrow: s.eyebrow ?? '', title: s.title ?? '', body: s.body ?? '', caption: s.caption ?? '', steps } : null;
    }
    case 'trustSection':
      return { type: 'trust', title: s.title ?? '', intro: s.intro, items: (s.items ?? []) as never, link: link(s.link) };
    case 'factsSection':
      return { type: 'facts', eyebrow: s.eyebrow, title: s.title ?? '', items: (s.items ?? []) as never };
    default:
      return null;
  }
}

export async function getPage(slug: PageSlug, locale: Locale): Promise<PageContent> {
  const base = fallback.pages[slug];
  const doc = await sanityFetch<{
    seo?: { title?: string; description?: string; noindex?: boolean; ogImage?: SanityImage };
    heading?: string;
    intro?: string;
    eyebrow?: string;
    note?: string;
    heroShot?: SanityShot;
    ctas?: PageContent['ctas'];
    sections?: SanitySection[];
  } | null>(PAGE_QUERY, { slug, locale });
  if (!doc) return base;
  const sections = (doc.sections ?? []).map(mapSection).filter((s): s is Section => s !== null);
  return {
    slug,
    seo: {
      title: doc.seo?.title || base.seo.title,
      description: doc.seo?.description || base.seo.description,
      noindex: doc.seo?.noindex,
      ogImageUrl: sanityImageUrl(doc.seo?.ogImage, 1200),
    },
    heading: doc.heading || base.heading,
    intro: doc.intro || base.intro,
    eyebrow: doc.eyebrow || base.eyebrow,
    note: doc.note || base.note,
    heroShot: toShot(doc.heroShot) ?? base.heroShot,
    ctas: doc.ctas?.length ? doc.ctas : base.ctas,
    sections: sections.length ? sections : base.sections,
  };
}

const FEATURES_QUERY = `*[_type == "feature" && language == $locale] | order(order asc){
  "key": anchor, theme, title, summary, bullets, icon, plan, screenshot, screenshotAlt, order
}`;

export async function getFeatures(locale: Locale): Promise<Feature[]> {
  const docs = await sanityFetch<(Omit<Feature, 'screenshot'> & { screenshot?: SanityImage })[] | null>(FEATURES_QUERY, { locale });
  if (!docs?.length) return fallback.features;
  return docs.map((d) => ({
    ...d,
    bullets: d.bullets ?? [],
    screenshot: toImage(d.screenshot ?? null, d.screenshotAlt),
    screenshotAlt: d.screenshotAlt || d.title,
  }));
}

const PLANS_QUERY = `*[_type == "pricingPlan" && language == $locale] | order(order asc){
  "key": planKey, name, tagline, priceMonthly, priceVisible,
  "caps": {"applications": applicationsCap, "searchProfiles": searchProfilesCap, "interviewTemplates": interviewTemplatesCap},
  intro, features, ctaLabel, order
}`;

export async function getPlans(locale: Locale): Promise<PricingPlan[]> {
  const docs = await sanityFetch<(Omit<PricingPlan, 'currency'>)[] | null>(PLANS_QUERY, { locale });
  if (!docs?.length) return fallback.plans;
  return docs.map((d) => ({ ...d, currency: 'EUR' as const, features: d.features ?? [], caps: d.caps }));
}

const RESOURCE_FIELDS = `
  "slug": slug.current, title, excerpt, category, publishedAt, updatedAt, author,
  cover, body,
  "seo": {"title": seoTitle, "description": seoDescription, "noindex": noindex}
`;

type SanityResource = Omit<Resource, 'cover' | 'readingMinutes' | 'body'> & { cover?: SanityImage; body?: PortableTextBlock[] };

function readingMinutes(body: PortableTextBlock[]): number {
  const words = body
    .flatMap((b) => ((b as { children?: { text?: string }[] }).children ?? []).map((c) => c.text ?? ''))
    .join(' ')
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

function mapResource(d: SanityResource): Resource {
  const body = d.body ?? [];
  return { ...d, body, cover: toImage(d.cover ?? null, d.title), readingMinutes: readingMinutes(body), author: d.author || 'The applyspace team' };
}

export async function getResources(locale: Locale): Promise<Resource[]> {
  const docs = await sanityFetch<SanityResource[] | null>(
    `*[_type == "resource" && language == $locale && defined(slug.current)] | order(publishedAt desc){${RESOURCE_FIELDS}}`,
    { locale },
  );
  if (!docs?.length) return fallback.resources;
  return docs.map(mapResource);
}

export async function getResource(slug: string, locale: Locale): Promise<Resource | null> {
  const doc = await sanityFetch<SanityResource | null>(
    `*[_type == "resource" && language == $locale && slug.current == $slug][0]{${RESOURCE_FIELDS}}`,
    { slug, locale },
  );
  if (doc) return mapResource(doc);
  return fallback.resources.find((r) => r.slug === slug) ?? null;
}
