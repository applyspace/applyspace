import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { GeistSans } from 'geist/font/sans';
import '../globals.css';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { JsonLd } from '@/components/seo/JsonLd';
import { ui } from '@/content/ui';
import { getSiteSettings } from '@/lib/content';
import { SITE_URL, isIndexable } from '@/lib/env';
import { isLocale, locales } from '@/lib/i18n';
import { organizationLd, websiteLd } from '@/lib/jsonld';

export const dynamicParams = false;

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#ffffff' };

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'applyspace', template: '%s | applyspace' },
  applicationName: 'applyspace',
  robots: isIndexable ? { index: true, follow: true } : { index: false, follow: false },
};

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const settings = await getSiteSettings(locale);
  const t = ui[locale];

  return (
    <html lang={locale} className={GeistSans.variable}>
      <body className="min-h-screen bg-white text-stone-950 antialiased">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-stone-950 focus:px-4 focus:py-2 focus:text-white">
          {t.skipToContent}
        </a>
        <JsonLd data={[organizationLd(), websiteLd(locale)]} />
        <Header locale={locale} settings={settings} />
        <main id="main">{children}</main>
        <Footer locale={locale} settings={settings} />
      </body>
    </html>
  );
}
