'use client';

import { useState, useTransition } from 'react';
import { analytics } from '@/lib/analytics';
import { useRouter } from 'next/navigation';
import { HugeiconsIcon } from '@hugeicons/react';
import { Alert02Icon, Loading03Icon, Search01Icon, Tick02Icon } from '@hugeicons/core-free-icons';
import { runSearch } from '@/app/(auth)/offers/actions';

type Status =
  | { kind: 'idle' }
  | { kind: 'success' | 'empty' | 'error'; message: string };

const plural = (n: number) => (n === 1 ? 'offer' : 'offers');

/** "Search now": runs the search through its connector and reports the outcome. */
export function SearchNowButton({ searchId }: { searchId: string }) {
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const run = () => {
    setStatus({ kind: 'idle' });
    startTransition(async () => {
      let result;
      try {
        result = await runSearch(searchId);
      } catch {
        setStatus({ kind: 'error', message: 'The search failed. Please try again.' });
        return;
      }
      if (!result.ok) {
        setStatus({ kind: 'error', message: result.message });
        return;
      }
      analytics.capture('search_run_completed', {
        offers_found: result.found,
        offers_inserted: result.inserted,
        offers_updated: result.updated,
      });
      if (result.found === 0) {
        setStatus({ kind: 'empty', message: 'No offers found for this search.' });
      } else if (result.inserted === 0) {
        setStatus({ kind: 'success', message: 'No new offers. Everything is up to date.' });
      } else {
        setStatus({
          kind: 'success',
          message: `${result.inserted} new ${plural(result.inserted)}`,
        });
      }
      router.refresh();
    });
  };

  const message = status.kind === 'idle' ? null : status.message;

  return (
    <div className="mt-0.5 flex shrink-0 items-center gap-3">
      <span
        role="status"
        aria-live="polite"
        className={`flex max-w-72 items-center gap-1.5 text-sm ${
          status.kind === 'error' ? 'text-destructive' : 'text-muted-foreground'
        }`}
      >
        {status.kind === 'success' && <HugeiconsIcon icon={Tick02Icon} size={14} className="shrink-0" />}
        {status.kind === 'error' && <HugeiconsIcon icon={Alert02Icon} size={14} className="shrink-0" />}
        {message}
      </span>
      <button
        type="button"
        onClick={run}
        disabled={pending}
        aria-busy={pending}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-stone-950 px-3.5 text-sm font-medium text-white transition-colors hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <HugeiconsIcon
          icon={pending ? Loading03Icon : Search01Icon}
          size={14}
          className={pending ? 'animate-spin' : undefined}
        />
        {pending ? 'Searching…' : 'Search now'}
      </button>
    </div>
  );
}
