import { AppShell } from '@/components/layout/AppShell';
import { readJobs } from '@/lib/jobs';
import { readApplications, readInterviews } from '@/lib/applications';
import { readProfiles } from '@/lib/profiles';
import { readOfferGroups } from '@/lib/offer-groups';
import type { OfferGroupWithCount } from '@/types/offer-groups';

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const [{ jobs }, applications, interviews, profiles, offerGroups] = await Promise.all([
    readJobs(),
    readApplications(),
    readInterviews(),
    readProfiles(),
    readOfferGroups(),
  ]);

  // Every offer group links to the full scraped list — same content as /offers.
  const offerGroupsWithCount: OfferGroupWithCount[] = offerGroups.map((g) => ({
    ...g,
    count: jobs.length,
  }));

  return (
    <AppShell
      profiles={profiles}
      offerGroups={offerGroupsWithCount}
      applications={applications}
      interviews={interviews}
    >
      {children}
    </AppShell>
  );
}
