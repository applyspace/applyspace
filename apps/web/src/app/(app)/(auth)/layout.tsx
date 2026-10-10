import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { getAccount, needsOnboarding } from '@/lib/candidate-profile';
import { getSupabaseScope } from '@/lib/supabase/scope';
import { readOffers } from '@/lib/offers';
import { readApplications, readInterviews } from '@/lib/applications';
import { readSearches } from '@/lib/searches';
import { checkSourceConnected, readSettings } from '@/lib/settings';
import { ALL_SOURCES } from '@/lib/sources';
import type { SearchWithCount } from '@apply/core/searches';

// Every authenticated route is rendered on demand from the local SQLite DB —
// there is nothing to pre-render at build time. Forcing dynamic here also
// prevents Next's static-gen workers from opening the DB and loading the
// full server bundle in parallel during `next build`, which previously OOM'd
// the 18 GB machine when packaging for Electron.
export const dynamic = 'force-dynamic';

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  // Onboarding guard: a signed-in user whose account has no `onboarded_at` yet
  // goes through /onboarding first. That page lives outside this layout, so it
  // cannot loop. Skipped when nobody is signed in (demo, desktop), and
  // `needsOnboarding` answers false while the column does not exist yet.
  const scope = await getSupabaseScope();
  if (scope && (await needsOnboarding(scope))) redirect('/onboarding');

  // Plan for the sidebar's "New search" gating; unknown (null) when it cannot be read.
  const plan = scope ? await getAccount(scope).then((a) => a.plan, () => null) : null;

  const [offers, applications, interviews, searches, settings, connected] = await Promise.all([
    readOffers(),
    readApplications(),
    readInterviews(),
    readSearches(),
    // Account name for the sidebar user button and Settings > Account.
    readSettings(),
    // Job board connections for Settings > Connectors.
    Promise.all(ALL_SOURCES.map((src) => checkSourceConnected(src))),
  ]);

  // Every search currently links to the full scraped list — same content as
  // /offers. When the scraper starts tagging offers with the search that
  // matched them, this count becomes a real per-search filter.
  const searchesWithCount: SearchWithCount[] = searches.map((s) => ({
    ...s,
    count: offers.length,
  }));

  const platformStatuses = Object.fromEntries(ALL_SOURCES.map((src, i) => [src, connected[i]]));

  return (
    <AppShell
      searches={searchesWithCount}
      applications={applications}
      interviews={interviews}
      firstName={settings.firstName}
      lastName={settings.lastName}
      platformStatuses={platformStatuses}
      plan={plan}
    >
      {children}
    </AppShell>
  );
}
