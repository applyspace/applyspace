'use client';

import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  ArrowUpDownIcon,
  ColumnInsertIcon,
  LinkSquare01Icon,
} from '@hugeicons/core-free-icons';
import type { ApplicationStatus } from '@apply/core/applications';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { daysBetween, type HubApplication } from '@/lib/applicationsHub';
import { useHubT } from '@/lib/applicationsI18n';
import {
  DEFAULT_SORT,
  TABLE_COLUMNS,
  nextSort,
  nextStepAt,
  parseColumns,
  serializeColumns,
  sortApplications,
  type Sort,
  type SortKey,
  type TableColumn,
} from '@/lib/applicationsTable';
import { useLocalStorageItem } from '@/lib/useLocalStorage';
import { cn } from '@/lib/utils';
import { CompanyLogo } from './CompanyLogo';
import { StatusMenu } from './StatusMenu';
import { formatDay } from './dates';

/** Sortable table of applications. The column choice is remembered in this browser. */
export function TableLayout({
  applications,
  now,
  onOpen,
  onMove,
}: {
  applications: HubApplication[];
  now: number;
  onOpen: (application: HubApplication) => void;
  onMove: (id: string, status: ApplicationStatus) => void;
}) {
  const { t, locale } = useHubT();
  const [saved, save] = useLocalStorageItem('apply-applications-columns');
  const [sort, setSort] = useState<Sort>(DEFAULT_SORT);
  const columns = parseColumns(saved);
  const rows = sortApplications(applications, sort);

  function toggleColumn(column: TableColumn, on: boolean) {
    const next = TABLE_COLUMNS.filter((c) => (c === column ? on : columns.includes(c)));
    save(serializeColumns(next));
  }

  function cell(a: HubApplication, column: TableColumn): React.ReactNode {
    switch (column) {
      case 'company':
        return (
          <button
            type="button"
            onClick={() => onOpen(a)}
            className="flex w-full min-w-0 items-center gap-2.5 rounded-lg text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
          >
            <CompanyLogo name={a.companyName} domain={a.companyDomain} className="size-8" />
            <span className="truncate font-medium text-foreground">{a.companyName}</span>
          </button>
        );
      case 'title':
        return <span className="block truncate">{a.jobTitle}</span>;
      case 'status':
        return <StatusMenu status={a.status} onSelect={(s) => onMove(a.id, s)} variant="badge" />;
      case 'applied': {
        const days = daysBetween(a.appliedAt, now);
        return (
          <span title={days <= 0 ? t.today : t.daysAgo(days)}>{formatDay(a.appliedAt, locale)}</span>
        );
      }
      case 'location':
        return <span className="block truncate">{a.location ?? '-'}</span>;
      case 'nextStep': {
        const at = nextStepAt(a);
        if (!at) return <span className="text-muted-foreground">-</span>;
        const label = at === a.nextInterviewAt ? t.interview : t.deadline;
        return (
          <span>
            {label} {formatDay(at, locale)}
          </span>
        );
      }
      case 'link':
        return a.url ? (
          <a
            href={a.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t.openLink}
            className="inline-flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <HugeiconsIcon icon={LinkSquare01Icon} size={15} />
          </a>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
            <HugeiconsIcon icon={ColumnInsertIcon} size={15} />
            {t.columns}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-48">
            <DropdownMenuGroup>
              <DropdownMenuLabel>{t.chooseColumns}</DropdownMenuLabel>
              {TABLE_COLUMNS.filter((c) => c !== 'company').map((c) => (
                <DropdownMenuCheckboxItem
                  key={c}
                  checked={columns.includes(c)}
                  onCheckedChange={(on) => toggleColumn(c, on)}
                >
                  {t.columnNames[c]}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-2xl border">
        <table className="w-full min-w-max border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-background">
            <tr className="border-b text-left text-xs text-muted-foreground">
              {columns.map((c) => (
                <th
                  key={c}
                  scope="col"
                  aria-sort={
                    c === sort.key ? (sort.direction === 'asc' ? 'ascending' : 'descending') : undefined
                  }
                  className={cn('px-4 py-2.5 font-medium', c === 'company' && 'sticky left-0 z-10 bg-background')}
                >
                  {c === 'link' ? (
                    <span className="sr-only">{t.columnNames.link}</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSort((cur) => nextSort(cur, c as SortKey))}
                      className="inline-flex items-center gap-1 rounded-md outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/30"
                    >
                      {t.columnNames[c]}
                      <HugeiconsIcon
                        icon={c !== sort.key ? ArrowUpDownIcon : sort.direction === 'asc' ? ArrowUp01Icon : ArrowDown01Icon}
                        size={12}
                        className={c === sort.key ? 'text-foreground' : 'opacity-50'}
                      />
                    </button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id} className="group border-b last:border-b-0 hover:bg-muted/40">
                {columns.map((c) => (
                  <td
                    key={c}
                    className={cn(
                      'max-w-64 px-4 py-2.5 whitespace-nowrap text-muted-foreground',
                      c === 'company' && 'sticky left-0 z-[1] bg-background text-foreground group-hover:bg-muted',
                      c === 'title' && 'text-foreground',
                    )}
                  >
                    {cell(a, c)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
