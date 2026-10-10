import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { JsonLd } from '@/components/seo/JsonLd';
import { Hero } from '@/components/sections/Hero';
import { ui } from '@/content/ui';
import { getPage, getResources } from '@/lib/content';
import { localePath, type Locale } from '@/lib/i18n';
import { breadcrumbLd } from '@/lib/jsonld';
import { siteUrl } from '@/lib/links';
import { buildMetadata } from '@/lib/seo';

type Props = { params: Promise<{ locale: Locale }> };

const dateFmt = (iso: string, locale: string) => new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(iso));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const page = await getPage('resources', locale);
  return buildMetadata({ locale, path: '/resources', title: page.seo.title, description: page.seo.description, noindex: page.seo.noindex, ogImageUrl: page.seo.ogImageUrl });
}

export default async function ResourcesPage({ params }: Props) {
  const { locale } = await params;
  const [page, resources] = await Promise.all([getPage('resources', locale), getResources(locale)]);
  const t = ui[locale];
  return (
    <>
      <JsonLd data={breadcrumbLd([{ name: t.breadcrumbHome, url: siteUrl(locale, '/') }, { name: page.heading, url: siteUrl(locale, '/resources') }])} />
      <Hero locale={locale} heading={page.heading} intro={page.intro} align="left" />
      <section className="mx-auto max-w-6xl px-4 pt-12 sm:px-6">
        {resources.length === 0 ? (
          <p className="text-stone-600">{t.noArticles}</p>
        ) : (
          <ul className="grid list-none gap-5 md:grid-cols-2">
            {resources.map((r) => (
              <li key={r.slug}>
                <article className="relative h-full rounded-4xl bg-stone-100 p-7 transition-colors hover:bg-stone-200/70">
                  {r.cover && <Image src={r.cover.url} alt={r.cover.alt} width={800} height={450} sizes="(min-width: 768px) 560px, 100vw" className="mb-5 aspect-video w-full rounded-3xl object-cover" />}
                  <p className="text-xs text-stone-600">{r.category} · {t.readingTime(r.readingMinutes)}</p>
                  <h2 className="mt-2 text-xl font-semibold tracking-tight">
                    <Link href={localePath(locale, `/resources/${r.slug}`)} className="after:absolute after:inset-0">{r.title}</Link>
                  </h2>
                  <p className="mt-2 text-sm text-stone-600">{r.excerpt}</p>
                  <p className="mt-4 text-xs text-stone-500"><time dateTime={r.publishedAt}>{dateFmt(r.publishedAt, locale)}</time></p>
                </article>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
