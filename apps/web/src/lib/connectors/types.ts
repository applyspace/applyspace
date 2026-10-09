import type { Search } from '@apply/db/schema';

/** The search criteria a connector needs; a subset of the `searches` row. */
export type ConnectorSearch = Pick<
  Search,
  | 'searchTitle'
  | 'location'
  | 'contractTypes'
  | 'experienceLevels'
  | 'remoteMode'
  | 'salaryMinEur'
  | 'salaryMaxEur'
>;

/** One offer as a platform returns it, before normalisation. */
export interface ConnectorOffer {
  /** Stable id on the platform, unique per platform. */
  externalId: string;
  title: string;
  company: string;
  location?: string;
  contract?: string;
  /** Raw salary text, parsed on save. */
  salary?: string;
  description?: string;
  url: string;
  /** ISO date. */
  postedAt?: string;
}

export type ConnectorResult =
  | { status: 'ok'; offers: ConnectorOffer[] }
  /** No execution backend is available here (for example the web app). */
  | { status: 'unavailable'; message: string }
  | { status: 'error'; message: string };

/**
 * A job platform connector. Keep it this small: the desktop app or the browser
 * extension plugs in later by providing another implementation for a slug.
 */
export interface OfferConnector {
  /** `platforms.slug` the offers are saved under. */
  slug: string;
  searchOffers(search: ConnectorSearch): Promise<ConnectorResult>;
}
