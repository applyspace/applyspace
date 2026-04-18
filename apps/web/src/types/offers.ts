import type { Company, Offer, Platform } from '@apply/db';

export type { Offer };

/**
 * An offer row pre-joined with its `company` + `platform` — what pages and
 * the `<JobTable>` component consume. Queries that return this shape must use
 * Drizzle's relational API with `with: { company: true, platform: true }`.
 */
export interface OfferWithRelations extends Offer {
  company: Company;
  platform: Platform;
}
