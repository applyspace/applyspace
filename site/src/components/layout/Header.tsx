import Link from 'next/link';
import { ApplyLogo } from './ApplyLogo';
import { MobileMenu } from './MobileMenu';
import { buttonStyles } from '@/components/ui/buttonStyles';
import type { SiteSettings } from '@/content/types';
import { ui } from '@/content/ui';
import { localePath, type Locale } from '@/lib/i18n';
import { appHref, internalHref } from '@/lib/links';

/** Logo left, navigation centre, Sign in (secondary) and Start for free (primary) right. */
export function Header({ locale, settings }: { locale: Locale; settings: SiteSettings }) {
  const t = ui[locale];
  const nav = settings.nav.map((n) => ({ label: n.label, href: internalHref(locale, n.href) }));
  const signIn = appHref('/login', 'header-sign-in');
  const start = appHref('/login', 'header-start');

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="relative mx-auto grid h-16 max-w-6xl grid-cols-[1fr_auto] items-center gap-4 px-4 sm:px-6 md:grid-cols-[1fr_auto_1fr]">
        <Link href={localePath(locale, '/')} aria-label="applyspace" className="justify-self-start">
          <ApplyLogo className="h-6 w-auto text-stone-950" />
        </Link>

        <nav aria-label={t.mainNav} className="hidden items-center gap-1 md:flex">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className={buttonStyles('ghost', 'md', 'text-base text-stone-700')}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 justify-self-end md:flex">
          <a href={signIn} className={buttonStyles('secondary')}>
            {t.signIn}
          </a>
          <a href={start} className={buttonStyles('primary')}>
            {t.startFree}
          </a>
        </div>

        <div className="justify-self-end">
          <MobileMenu
            nav={nav}
            signInHref={signIn}
            startHref={start}
            labels={{ menu: t.menu, close: t.closeMenu, signIn: t.signIn, start: t.startFree, nav: t.mainNav }}
          />
        </div>
      </div>
    </header>
  );
}
