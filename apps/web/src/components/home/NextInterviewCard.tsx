import Link from 'next/link';
import { HugeiconsIcon } from '@hugeicons/react';
import { Calendar03Icon } from '@hugeicons/core-free-icons';
import type { HomeNextInterview } from '@/lib/home';
import { HomeCard, HomeCardLabel } from './HomeCard';

const DATE_FORMAT = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const TIME_FORMAT = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' });

export function NextInterviewCard({ interview }: { interview: HomeNextInterview | null }) {
  const date = interview ? new Date(interview.startsAt) : null;
  // A date-only value ("2026-10-12") has no meaningful time to show.
  const hasTime = interview ? interview.startsAt.includes('T') : false;

  return (
    <HomeCard>
      <HomeCardLabel icon={<HugeiconsIcon icon={Calendar03Icon} size={16} />}>
        Next interview
      </HomeCardLabel>

      {interview && date ? (
        <>
          <p className="mt-3 text-xl font-semibold tracking-tight text-stone-950">
            <time dateTime={interview.startsAt}>
              {DATE_FORMAT.format(date)}
              {hasTime && <span className="text-stone-500"> at {TIME_FORMAT.format(date)}</span>}
            </time>
          </p>
          <p className="mt-1 text-sm text-stone-700">
            {interview.companyName}, {interview.jobTitle}
          </p>
          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="inline-flex h-6 items-center rounded-md bg-stone-100 px-2 text-xs font-medium text-stone-700">
              {interview.stage}
            </span>
            <Link
              href="/interviews"
              className="text-sm font-medium text-stone-950 underline-offset-4 hover:underline"
            >
              All interviews
            </Link>
          </div>
        </>
      ) : (
        <p className="mt-3 text-sm text-stone-600">
          No interview scheduled yet. It will show up here as soon as one has a date.
        </p>
      )}
    </HomeCard>
  );
}
