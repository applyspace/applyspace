'use client';

import { HugeiconsIcon } from '@hugeicons/react';
import { MoreHorizontalIcon, Tick02Icon, ArrowDown01Icon } from '@hugeicons/core-free-icons';
import type { ApplicationStatus } from '@apply/core/applications';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { HUB_STATUSES } from '@/lib/applicationsHub';
import { useHubT } from '@/lib/applicationsI18n';
import { cn } from '@/lib/utils';
import { STATUS_TONE } from './statusTone';

/** Menu that moves an application to another status. `icon` is the card's three dots, `badge` shows the current status. */
export function StatusMenu({
  status,
  onSelect,
  variant = 'icon',
  className,
}: {
  status: ApplicationStatus;
  onSelect: (status: ApplicationStatus) => void;
  variant?: 'icon' | 'badge';
  className?: string;
}) {
  const { t } = useHubT();
  return (
    <DropdownMenu>
      {variant === 'icon' ? (
        <DropdownMenuTrigger
          aria-label={t.menu}
          className={cn(
            'flex size-7 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/30',
            className,
          )}
        >
          <HugeiconsIcon icon={MoreHorizontalIcon} size={16} />
        </DropdownMenuTrigger>
      ) : (
        <DropdownMenuTrigger
          className={cn(
            'inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/30',
            STATUS_TONE[status].badge,
            className,
          )}
        >
          {t.statuses[status]}
          <HugeiconsIcon icon={ArrowDown01Icon} size={12} />
        </DropdownMenuTrigger>
      )}
      <DropdownMenuContent align="end" className="min-w-52">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t.moveTo}</DropdownMenuLabel>
          {HUB_STATUSES.map((s) => (
            <DropdownMenuItem key={s} onClick={() => s !== status && onSelect(s)}>
              <span className={cn('size-2 rounded-full', STATUS_TONE[s].dot)} />
              <span className="flex-1">{t.statuses[s]}</span>
              {s === status && <HugeiconsIcon icon={Tick02Icon} size={14} />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
