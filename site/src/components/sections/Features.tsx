import { PlanTag } from '@/components/ui/PlanTag';
import { FeatureIcon } from '@/components/ui/icons';
import { ScreenshotPlaceholder } from '@/components/ui/ScreenshotPlaceholder';
import { themes } from '@/content/fallback';
import type { Feature } from '@/content/types';
import { ui } from '@/content/ui';
import type { Locale } from '@/lib/i18n';

/** Features grouped by theme; each feature is an <article> with an anchor id (`/product#applications-board`). */
export function Features({ locale, features }: { locale: Locale; features: Feature[] }) {
  const t = ui[locale];
  const groups = themes
    .map((th) => ({ ...th, items: features.filter((f) => f.theme === th.key).sort((a, b) => a.order - b.order) }))
    .filter((g) => g.items.length);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <nav aria-label={t.onThisPage} className="sticky top-16 z-30 -mx-4 mt-10 overflow-x-auto border-b border-stone-200 bg-white/90 px-4 backdrop-blur sm:-mx-6 sm:px-6">
        <ul className="flex min-w-max gap-1 py-2 text-sm">
          {groups.map((g) => (
            <li key={g.key}>
              <a href={`#theme-${g.key}`} className="block rounded-full px-3.5 py-1.5 text-stone-700 hover:bg-stone-100">{g.title}</a>
            </li>
          ))}
        </ul>
      </nav>

      {groups.map((g) => (
        <section key={g.key} id={`theme-${g.key}`} aria-labelledby={`h-${g.key}`} className="pt-16">
          <h2 id={`h-${g.key}`} className="font-display text-3xl text-stone-950 sm:text-4xl">{g.title}</h2>
          <p className="mt-2 max-w-2xl text-stone-600">{g.intro}</p>
          <div className="mt-10 space-y-16">
            {g.items.map((f, i) => (
              <article key={f.key} id={f.key} className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
                <div className={i % 2 === 1 ? 'lg:order-2' : undefined}>
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-2xl bg-stone-100 text-stone-800">
                      <FeatureIcon name={f.icon} />
                    </span>
                    {f.soon && <PlanTag plan="free" label={t.soon} size="sm" className="bg-stone-100 text-stone-700" />}
                  </div>
                  <h3 className="mt-4 text-2xl font-semibold tracking-tight text-stone-950">{f.title}</h3>
                  <p className="mt-2 text-pretty text-stone-600">{f.summary}</p>
                  <ul className="mt-4 space-y-1.5 text-sm text-stone-700">
                    {f.bullets.map((b) => (
                      <li key={b} className="flex gap-2.5"><span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-stone-400" />{b}</li>
                    ))}
                  </ul>
                </div>
                <ScreenshotPlaceholder alt={f.screenshotAlt} image={f.screenshot} label={`${t.screenshotLabel}: ${f.title}`} className={i % 2 === 1 ? 'lg:order-1' : undefined} />
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
