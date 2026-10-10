import { ApplicationsHub } from '@/components/applications/ApplicationsHub';
import { readApplications, readInterviews } from '@/lib/applications';
import { readApplicationsContext } from '@/lib/applicationsForm';
import { parseLayout, toHubApplications } from '@/lib/applicationsHub';

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ layout?: string | string[]; new?: string | string[] }>;
}) {
  const { layout, new: openNew } = await searchParams;
  const [applications, interviews, context] = await Promise.all([
    readApplications(),
    readInterviews(),
    readApplicationsContext(),
  ]);

  return (
    <ApplicationsHub
      applications={toHubApplications(applications, interviews)}
      cap={context.cap}
      nowIso={new Date().toISOString()}
      initialLayout={parseLayout(layout)}
      canCreate={context.signedIn}
      initialNew={context.signedIn && openNew === '1'}
      today={context.today}
      companyNames={context.companyNames}
      documents={context.documents}
    />
  );
}
