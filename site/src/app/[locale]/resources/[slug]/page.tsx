import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { JsonLd } from '@/components/seo/JsonLd';
import { PortableTextBody } from '@/components/ui/PortableTextBody';
import { buttonStyles } from '@/components/ui/buttonStyles';
import { ui } from '@/content/ui';
import { getResource, getResources } from '@/lib/content';
import { locales, localePath, type Locale } from '@/lib/i18n';
import { articleLd, breadcrumbLd } from '@/lib/jsonld';
import { appHref, siteUrl } from '@/lib/links';
import { buildMetadata, ogImage } from '@/lib/seo';

type Props = { params: Promise<{ locale: Locale; slug: string }> };

// Articles published after the build are rendered on demand, then cached.
export const dynamicParams = true;

const dateFmt = (iso: string, locale: string) => new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(new Date(iso));

export async function generateStaticParams() {
  const all = await Promise.all(locales.map(async (locale) => (await getResources(locale)).map((r) => ({ locale, slug: r.slug }))));
  return all.flat();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const r = await getResource(slug, locale);
  if (!r) return {};
  return buildMetadata({
    locale,
    path: `/resources/${r.slug}`,
    title: r.seo?.title || r.title,
    description: r.seo?.description || r.excerpt,
    noindex: r.seo?.noindex,
    ogImageUrl: r.cover?.url,
    type: 'article',
    publishedTime: r.publishedAt,
    modifiedTime: r.updatedAt,
  });
}

export default async function ArticlePage({ params }: Props) {
  const { locale, slug } = await params;
  const [r, all] = await Promise.all([getResource(slug, locale), getResources(locale)]);
  if (!r) notFound();
  const t = ui[locale];
  const related = all.filter((x) => x.slug !== r.slug).slice(0, 2);

  return (
    <>
      <JsonLd
        data={[
          articleLd(locale, r, ogImage(r.title, r.cover?.url)),
          breadcrumbLd([
            { name: t.breadcrumbHome, url: siteUrl(locale, '/') },
            { name: 'Resources', url: siteUrl(locale, '/resources') },
            { name: r.title, url: siteUrl(locale, `/resources/${r.slug}`) },
          ]),
        ]}
      />
      <article className="mx-auto max-w-3xl px-4 pt-12 sm:px-6 sm:pt-16">
        <nav aria-label="Breadcrumb" className="text-sm text-stone-600">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li><Link href={localePath(locale, '/')} className="hover:text-stone-950">{t.breadcrumbHome}</Link></li>
            <li aria-hidden>/</li>
            <li><Link href={localePath(locale, '/resources')} className="hover:text-stone-950">{t.allResources}</Link></li>
          </ol>
        </nav>
        <p className="mt-8 text-sm text-stone-600">{r.category} · {t.readingTime(r.readingMinutes)}</p>
        <h1 className="font-display mt-2 text-balance text-4xl text-stone-950 sm:text-5xl">{r.title}</h1>
        <p className="mt-4 text-lg text-stone-600">{r.excerpt}</p>
        <p className="mt-6 text-sm text-stone-500">
          {t.by} {r.author} · {t.published} <time dateTime={r.publishedAt}>{dateFmt(r.publishedAt, locale)}</time>
          {r.updatedAt && r.updatedAt !== r.publishedAt && <> · {t.updated} <time dateTime={r.updatedAt}>{dateFmt(r.updatedAt, locale)}</time></>}
        </p>
        {r.cover && <Image src={r.cover.url} alt={r.cover.alt} width={1400} height={788} priority sizes="(min-width: 768px) 720px, 100vw" className="mt-8 aspect-video w-full rounded-4xl object-cover" />}
        <div className="mt-8"><PortableTextBody value={r.body} /></div>

        <aside className="mt-16 rounded-4xl bg-brand-50 px-7 py-10 text-center">
          <h2 className="font-display text-2xl text-stone-950">Track your applications in applyspace</h2>
          <p className="mx-auto mt-2 max-w-md text-stone-600">Free to start. Board, table, timeline and map on the same data.</p>
          <a href={appHref('/login', `article-${r.slug}`)} className={buttonStyles('primary', 'lg', 'mt-6')}>{t.startFree}</a>
        </aside>

        {related.length > 0 && (
          <section className="mt-16" aria-labelledby="related">
            <h2 id="related" className="text-lg font-semibold">{t.allResources}</h2>
            <ul className="mt-4 grid list-none gap-4 sm:grid-cols-2">
              {related.map((x) => (
                <li key={x.slug}>
                  <Link href={localePath(locale, `/resources/${x.slug}`)} className="block h-full rounded-3xl bg-stone-100 p-5 hover:bg-stone-200/70">
                    <span className="text-xs text-stone-600">{x.category}</span>
                    <span className="mt-1 block font-semibold tracking-tight">{x.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>
    </>
  );
}
