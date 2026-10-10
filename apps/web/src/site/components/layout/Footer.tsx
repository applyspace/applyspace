import Link from 'next/link';
import { ApplyLogo } from './ApplyLogo';
import type { SiteSettings } from '@/site/content/types';
import { ui } from '@/site/content/ui';
import { type Locale } from '@/site/lib/i18n';
import { appHref, downloadHref, internalHref } from '@/site/lib/links';

const linkCls = 'inline-flex min-h-8 items-center text-stone-700 hover:text-stone-950 hover:underline hover:underline-offset-4';

/** Brand and tagline, then link columns (2 per row on phones), then a bottom bar. */
export function Footer({ locale, settings }: { locale: Locale; settings: SiteSettings }) {
  const t = ui[locale];
  return (
    <footer className="mt-24 border-t border-stone-200">
      <div className="mx-auto grid max-w-[1248px] gap-10 px-4 py-14 sm:px-6 md:grid-cols-12">
        <div className="md:col-span-5">
          <ApplyLogo className="h-6 w-auto text-stone-950" />
          <p className="mt-4 max-w-sm text-sm text-stone-600">{settings.tagline}</p>
        </div>
        <nav aria-label={t.footerNav} className="grid grid-cols-2 gap-8 text-sm md:col-span-6 md:col-start-7">
          <div>
            <h2 className="text-[13px] font-medium uppercase tracking-[0.06em] text-stone-500">{t.footerProduct}</h2>
            <ul className="mt-3 space-y-1">
              {settings.footerNav.map((item) => (
                <li key={item.href}>
                  <Link href={internalHref(locale, item.href)} className={linkCls}>
                    {item.label}
                  </Link>
                </li>
              ))}
              {settings.social.map((s) => (
                <li key={s.url}>
                  <a href={s.url} rel="me noopener" className={linkCls}>
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-[13px] font-medium uppercase tracking-[0.06em] text-stone-500">{t.footerAccount}</h2>
            <ul className="mt-3 space-y-1">
              <li>
                <a href={appHref('/login', 'footer-sign-in')} className={linkCls}>
                  {t.signIn}
                </a>
              </li>
              <li>
                <a href={appHref('/login', 'footer-start')} className={linkCls}>
                  {t.startFree}
                </a>
              </li>
              <li>
                <a href={downloadHref('footer-download')} className={linkCls}>
                  {t.download}
                </a>
              </li>
              {settings.contactEmail && (
                <li>
                  <a href={`mailto:${settings.contactEmail}`} className={linkCls}>
                    {settings.contactEmail}
                  </a>
                </li>
              )}
            </ul>
          </div>
        </nav>
      </div>
      <div className="mx-auto max-w-[1248px] px-4 sm:px-6">
        <div className="flex flex-col gap-1 border-t border-stone-200 py-6 text-xs text-stone-600 sm:flex-row sm:justify-between">
          <span>{t.copyright(new Date().getFullYear())}</span>
          <span>{t.madeIn}</span>
        </div>
      </div>
    </footer>
  );
}
