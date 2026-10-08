import type { OfferConnector } from './types';
import { wttjConnector } from './wttj';

const CONNECTORS: Record<string, OfferConnector> = {
  [wttjConnector.slug]: wttjConnector,
};

/** The connector for a `platforms.slug`, or null when none is registered. */
export function getConnector(slug: string): OfferConnector | null {
  return CONNECTORS[slug] ?? null;
}

export type { ConnectorOffer, ConnectorResult, ConnectorSearch, OfferConnector } from './types';
