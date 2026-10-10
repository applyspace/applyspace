import { applicationCap } from '@apply/core/applications';
import { ApplicationsHub } from '@/components/applications/ApplicationsHub';
import { readApplications, readInterviews } from '@/lib/applications';
import { parseLayout, toHubApplications } from '@/lib/applicationsHub';
import { getAccount } from '@/lib/candidate-profile';
import { getSupabaseScope } from '@/lib/supabase/scope';

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ layout?: string | string[] }>;
}) {
  const { layout } = await searchParams;
  const scope = await getSupabaseScope();
  const [applications, interviews, plan] = await Promise.all([
    readApplications(),
    readInterviews(),
    // Plan for the cap meter; unknown (null) when it cannot be read.
    scope ? getAccount(scope).then((a) => a.plan as string, () => null) : null,
  ]);

  return (
    <ApplicationsHub
      applications={toHubApplications(applications, interviews)}
      cap={scope ? applicationCap(plan) : null}
      nowIso={new Date().toISOString()}
      initialLayout={parseLayout(layout)}
    />
  );
}
