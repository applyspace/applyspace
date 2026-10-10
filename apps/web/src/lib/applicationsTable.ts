import { HUB_STATUSES, type HubApplication } from '@/lib/applicationsHub';

/** Columns of the Table layout. `company` is always shown. */
export const TABLE_COLUMNS = ['company', 'title', 'status', 'applied', 'location', 'nextStep', 'link'] as const;
export type TableColumn = (typeof TABLE_COLUMNS)[number];

export const DEFAULT_COLUMNS: readonly TableColumn[] = ['company', 'title', 'status', 'applied', 'location', 'nextStep'];

/** Columns that can be sorted. */
export type SortKey = Exclude<TableColumn, 'link'>;
export type SortDirection = 'asc' | 'desc';
export interface Sort {
  key: SortKey;
  direction: SortDirection;
}

export const DEFAULT_SORT: Sort = { key: 'applied', direction: 'desc' };

/** Reads the saved column list; unknown names are dropped and `company` is always kept. */
export function parseColumns(saved: string | null): TableColumn[] {
  if (!saved) return [...DEFAULT_COLUMNS];
  const wanted = saved.split(',');
  const columns = TABLE_COLUMNS.filter((c) => c === 'company' || wanted.includes(c));
  return columns.length > 1 ? columns : [...DEFAULT_COLUMNS];
}

export const serializeColumns = (columns: readonly TableColumn[]) => columns.join(',');

/** Soonest of the next interview and the deadline: what to do next. */
export function nextStepAt(a: HubApplication): string | null {
  const dates = [a.nextInterviewAt, a.deadlineAt].filter((d): d is string => d !== null);
  return dates.sort()[0] ?? null;
}

const text = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'base' });

/** Empty values sort last whatever the direction. */
function compareNullable(a: string | null, b: string | null, direction: SortDirection): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return direction === 'asc' ? text(a, b) : text(b, a);
}

export function sortApplications(apps: HubApplication[], sort: Sort): HubApplication[] {
  const sign = sort.direction === 'asc' ? 1 : -1;
  return [...apps].sort((x, y) => {
    switch (sort.key) {
      case 'company':
        return sign * text(x.companyName, y.companyName);
      case 'title':
        return sign * text(x.jobTitle, y.jobTitle);
      case 'status':
        return sign * (HUB_STATUSES.indexOf(x.status) - HUB_STATUSES.indexOf(y.status));
      case 'applied':
        return sign * (Date.parse(x.appliedAt) - Date.parse(y.appliedAt) || 0);
      case 'location':
        return compareNullable(x.location, y.location, sort.direction);
      case 'nextStep':
        return compareNullable(nextStepAt(x), nextStepAt(y), sort.direction);
    }
  });
}

/** Header click: new column sorts ascending, then descending, then back to the default order. */
export function nextSort(current: Sort, key: SortKey): Sort {
  if (current.key !== key) return { key, direction: key === 'applied' ? 'desc' : 'asc' };
  if (current.direction === 'asc') return { key, direction: 'desc' };
  return current.key === DEFAULT_SORT.key && current.direction === DEFAULT_SORT.direction
    ? { key, direction: 'asc' }
    : DEFAULT_SORT;
}
