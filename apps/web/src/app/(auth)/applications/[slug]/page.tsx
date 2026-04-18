import { notFound } from 'next/navigation';
import { readApplications } from '@/lib/applications';
import { matchIdInSlug } from '@/lib/slug';

const STATUS_LABEL: Record<string, string> = {
  waiting: 'Waiting for answer',
  interviewing: 'Interviewing',
  accepted: 'Accepted',
  rejected: 'Rejected',
  ghosted: 'Ghosted',
  withdrawn: 'Withdrawn',
};

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const applications = await readApplications();
  const id = matchIdInSlug(
    slug,
    applications.map((a) => a.id)
  );
  const application = applications.find((a) => a.id === id);
  if (!application) notFound();

  return (
    <div className="px-20 py-12">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight text-foreground">
        {application.company.name}
      </h1>
      <p className="mb-8 text-sm text-muted-foreground">{application.jobTitle}</p>

      <dl className="grid max-w-md grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
        <dt className="text-muted-foreground">Status</dt>
        <dd className="text-foreground">{STATUS_LABEL[application.status] ?? application.status}</dd>

        <dt className="text-muted-foreground">Applied on</dt>
        <dd className="text-foreground">{application.appliedAt}</dd>
      </dl>
    </div>
  );
}
