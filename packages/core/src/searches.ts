import type { Search } from '@apply/db';

export type { Search };

/**
 * A search row enriched with the current count of scraped offers it matches.
 * Computed server-side in `apps/web/src/app/(auth)/layout.tsx` and passed to
 * the sidebar. Legacy name in the UI: "offer group".
 */
export interface SearchWithCount extends Search {
  count: number;
}
