import { HugeiconsIcon } from '@hugeicons/react';
import { CheckmarkCircle01Icon, CancelCircleIcon } from '@hugeicons/core-free-icons';
import { SOURCE_META, ALL_SOURCES } from '@/lib/sources';
import { cn } from '@/lib/utils';

interface PlatformStatusProps {
  statuses: Record<string, boolean>;
}

export function PlatformStatus({ statuses }: PlatformStatusProps) {
  return (
    <div className="flex flex-col gap-2">
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
              <span className="text-sm font-medium text-zinc-800">{meta.label}</span>
            </div>
            <div className="flex items-center gap-1.5">
              {connected ? (
                <>
                  <HugeiconsIcon icon={CheckmarkCircle01Icon} size={16} className="text-green-500" />
                  <span className="text-xs text-green-600">Connecté</span>
                </>
              ) : (
                <>
                  <HugeiconsIcon icon={CancelCircleIcon} size={16} className="text-zinc-300" />
                  <span className="text-xs text-zinc-400">Non connecté</span>
                </>
              )}
            </div>
          </div>
        );
      })}
      <p className="mt-1 text-xs text-zinc-400">
        Lancez <code className="rounded bg-zinc-100 px-1 py-0.5 text-zinc-600">pnpm auth</code> pour connecter une plateforme.
      </p>
    </div>
  );
}
