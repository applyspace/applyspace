'use client';

import { useState, useCallback } from 'react';
import { JobCard } from '@/components/jobs/JobCard';
import { JobDetail } from '@/components/jobs/JobDetail';
import type { Job } from '@/types/jobs';

export type JobStatus = 'unreviewed' | 'applied' | 'declined';

interface JobTableProps {
  jobs: Job[];
}

export function JobTable({ jobs }: JobTableProps) {
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [statuses, setStatuses] = useState<Record<string, JobStatus>>({});

  const handleDecline = useCallback((id: string) => {
    setStatuses((prev) => ({ ...prev, [id]: 'declined' }));
    setSelectedJob((prev) => (prev?.id === id ? null : prev));
  }, []);

  const handleApply = useCallback((id: string) => {
    setStatuses((prev) => ({ ...prev, [id]: 'applied' }));
  }, []);

  const visible = jobs.filter((j) => statuses[j.id] !== 'declined');

  if (visible.length === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-2 text-zinc-400">
        <p className="text-sm">No offers found.</p>
        <p className="text-xs">
          Run{' '}
          <code className="rounded bg-zinc-100 px-1 py-0.5 text-zinc-600">pnpm scrape</code>{' '}
          to fetch new offers.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-2.5">
        {visible.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            status={statuses[job.id] ?? 'unreviewed'}
            onSelect={setSelectedJob}
            onDecline={handleDecline}
            onApply={handleApply}
          />
        ))}
      </div>

      <JobDetail
        job={selectedJob}
        onClose={() => setSelectedJob(null)}
        onApply={handleApply}
      />
    </>
  );
}
