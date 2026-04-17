import { notFound } from 'next/navigation';
import { readInterviews } from '@/lib/applications';
import { matchIdInSlug } from '@/lib/slug';

export default async function InterviewDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const interviews = await readInterviews();
  const id = matchIdInSlug(
    slug,
    interviews.map((i) => i.id)
  );
  const interview = interviews.find((i) => i.id === id);
  if (!interview) notFound();

  return (
    <div className="px-20 py-12">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight text-foreground">
        {interview.company}
      </h1>
      <p className="mb-8 text-sm text-muted-foreground">{interview.jobTitle}</p>

      <dl className="grid max-w-md grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
        <dt className="text-muted-foreground">Stage</dt>
        <dd className="text-foreground">{interview.stage}</dd>
      </dl>
    </div>
  );
}
