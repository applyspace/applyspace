'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import { CheckmarkCircle01Icon, CancelCircleIcon } from '@hugeicons/core-free-icons';
import { SOURCE_META, ALL_SOURCES } from '@/lib/sources';
import { useLocale } from '@/components/providers/Providers';
import { cn } from '@/lib/utils';

const COMING_SOON = [
  { key: 'apec', label: 'APEC' },
  { key: 'indeed', label: 'Indeed' },
  { key: 'glassdoor', label: 'Glassdoor' },
  { key: 'cadremploi', label: 'Cadremploi' },
];

interface TabPlatformsProps {
  statuses: Record<string, boolean>;
}

export function TabPlatforms({ statuses }: TabPlatformsProps) {
  const { t } = useLocale();
  const tp = t.platforms;

  return (
    <div className="space-y-6">
      {/* Active scrapers */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-zinc-600">{tp.connected}</p>
        <p className="text-xs text-zinc-400">
          {tp.connectedHint.split('pnpm auth').map((part, i) => (
            i === 0 ? part : (
              <span key={i}>
                <code className="rounded bg-zinc-100 px-1 py-0.5 text-zinc-600">pnpm auth</code>
                {part}
              </span>
            )
          ))}
        </p>
        <div className="space-y-2">
          {ALL_SOURCES.map((src) => {
            const meta = SOURCE_META[src];
            const connected = statuses[src] ?? false;
            return (
              <div
                key={src}
                className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className={cn('h-2.5 w-2.5 rounded-full shrink-0', meta.dotCls)} />
                  <div>
                    <p className="text-sm font-medium text-zinc-800">{meta.label}</p>
                    <p className="text-xs text-zinc-400">{tp.scraping}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {connected ? (
                    <div className="flex items-center gap-1.5">
                      <HugeiconsIcon icon={CheckmarkCircle01Icon} size={16} className="text-green-500" />
                      <span className="text-xs text-green-600">{tp.connectedStatus}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <HugeiconsIcon icon={CancelCircleIcon} size={16} className="text-zinc-300" />
                      <span className="text-xs text-zinc-400">{tp.notConnectedStatus}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Coming soon */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-zinc-600">{tp.comingSoon}</p>
        <div className="space-y-2">
          {COMING_SOON.map((p) => (
            <div
              key={p.key}
              className="flex items-center justify-between rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-4 py-3 opacity-60"
            >
              <div className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 rounded-full bg-zinc-300 shrink-0" />
                <p className="text-sm font-medium text-zinc-500">{p.label}</p>
              </div>
              <span className="rounded-full border border-zinc-200 px-2 py-0.5 text-xs text-zinc-400">
                {tp.comingSoon}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Tip */}
      <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-3">
        <p className="text-xs text-zinc-500">
          <span className="font-medium text-zinc-700">{tp.howItWorksTitle} </span>
          {tp.howItWorksText}
        </p>
      </div>
    </div>
  );
}
