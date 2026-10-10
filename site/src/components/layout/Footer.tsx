import Link from 'next/link';
import { ApplyLogo } from './ApplyLogo';
import type { SiteSettings } from '@/content/types';
import { ui } from '@/content/ui';
import { type Locale } from '@/lib/i18n';
import { appHref, internalHref } from '@/lib/links';

export function Footer({ locale, settings }: { locale: Locale; settings: SiteSettings }) {
  const t = ui[locale];
  return (
    <footer className="mt-24 border-t border-stone-200">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 sm:px-6 md:flex-row md:justify-between">
        <div className="max-w-sm">
          <ApplyLogo className="h-6 w-auto text-stone-950" />
          <p className="mt-4 text-sm text-stone-600">{settings.tagline}</p>
        </div>
        <nav aria-label={t.footerNav} className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
          {settings.footerNav.map((item) => (
            <Link key={item.href} href={internalHref(locale, item.href)} className="text-stone-700 hover:text-stone-950">
              {item.label}
            </Link>
          ))}
          <a href={appHref('/login', 'footer-sign-in')} className="text-stone-700 hover:text-stone-950">
            {t.signIn}
          </a>
          {settings.social.map((s) => (
            <a key={s.url} href={s.url} rel="me noopener" className="text-stone-700 hover:text-stone-950">
              {s.label}
            </a>
          ))}
        </nav>
      </div>
      <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 pb-10 text-xs text-stone-500 sm:px-6 sm:flex-row sm:justify-between">
        <span>{t.copyright(new Date().getFullYear())}</span>
      </div>
    </footer>
  );
}
