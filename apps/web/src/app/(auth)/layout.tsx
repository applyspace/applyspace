import { AppShell } from '@/components/layout/AppShell';
import { readOffers } from '@/lib/offers';
import { readApplications, readInterviews } from '@/lib/applications';
import { readProfiles } from '@/lib/profiles';
import { readSearches } from '@/lib/searches';
import type { SearchWithCount } from '@/types/searches';

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const [offers, applications, interviews, profiles, searches] = await Promise.all([
    readOffers(),
    readApplications(),
    readInterviews(),
    readProfiles(),
    readSearches(),
  ]);

  // Every search currently links to the full scraped list — same content as
  // /offers. When the scraper starts tagging offers with the search that
  // matched them, this count becomes a real per-search filter.
  const searchesWithCount: SearchWithCount[] = searches.map((s) => ({
    ...s,
    count: offers.length,
  }));

  return (
    <AppShell
      profiles={profiles}
      searches={searchesWithCount}
      applications={applications}
      interviews={interviews}
    >
      {children}
    </AppShell>
  );
}
