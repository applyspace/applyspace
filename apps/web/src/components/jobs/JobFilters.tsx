'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { SOURCE_META, ALL_SOURCES } from '@/lib/sources';
import { cn } from '@/lib/utils';
import type { Source } from '@/types/platforms';

const CONTRACTS = ['CDI', 'CDD', 'Freelance', 'Stage', 'Alternance'];

export function JobFilters({ totalCount }: { totalCount: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeSource = searchParams.get('source') as Source | null;
  const activeContract = searchParams.get('contract');

  function setFilter(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null || params.get(key) === value) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`/offers?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-baseline gap-2">
        <h1 className="text-lg font-semibold text-zinc-900">Offres</h1>
        <span className="text-sm text-zinc-400">{totalCount}</span>
      </div>

      {/* Source pills */}
      <div className="flex flex-wrap gap-2">
        {ALL_SOURCES.map((src) => {
          const meta = SOURCE_META[src];
          const active = activeSource === src;
          return (
            <button
              key={src}
              onClick={() => setFilter('source', src)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition-all',
                active
                  ? meta.badgeCls
                  : 'border border-zinc-200 text-zinc-500 hover:border-zinc-300 hover:text-zinc-700'
              )}
            >
              {meta.label}
            </button>
          );
        })}
      </div>

      {/* Contract type pills */}
      <div className="flex flex-wrap gap-2">
        {CONTRACTS.map((c) => {
          const active = activeContract === c;
          return (
            <button
              key={c}
              onClick={() => setFilter('contract', c)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition-all',
                active
                  ? 'bg-zinc-900 text-white'
                  : 'border border-zinc-200 text-zinc-500 hover:border-zinc-300 hover:text-zinc-700'
              )}
            >
              {c}
            </button>
          );
        })}
      </div>
    </div>
  );
}
