import Link from 'next/link';
import { readInterviews } from '@/lib/applications';
import { entrySlug } from '@/lib/slug';

export default async function InterviewsPage() {
  const interviews = await readInterviews();

  return (
    <div className="px-20 py-12">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-foreground">Interviews</h1>
      {interviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">No active interviews.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {interviews.map((iv) => (
            <li key={iv.id}>
              <Link
                href={`/interviews/${entrySlug([iv.company, iv.jobTitle], iv.id)}`}
                className="flex items-center justify-between gap-4 rounded-md border border-border px-4 py-3 text-sm hover:bg-accent"
              >
                <span>
                  <span className="font-medium text-foreground">{iv.company}</span>
                  <span className="ml-1.5 text-muted-foreground">{iv.jobTitle}</span>
                </span>
                <span className="text-xs text-muted-foreground">{iv.stage}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
