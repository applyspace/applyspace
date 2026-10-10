import type { ApplicationStatus } from '@apply/core/applications';

/** Tailwind classes per status: a dot and a badge (light and dark). */
export const STATUS_TONE: Record<ApplicationStatus, { dot: string; badge: string }> = {
  waiting: {
    dot: 'bg-stone-400',
    badge: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-200',
  },
  interviewing: {
    dot: 'bg-blue-500',
    badge: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  },
  accepted: {
    dot: 'bg-green-500',
    badge: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300',
  },
  rejected: {
    dot: 'bg-red-500',
    badge: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
  },
  ghosted: {
    dot: 'bg-amber-500',
    badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  },
  withdrawn: {
    dot: 'bg-stone-300 dark:bg-stone-600',
    badge: 'bg-muted text-muted-foreground',
  },
};
