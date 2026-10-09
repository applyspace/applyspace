import type { OfferWithRelations } from '@apply/core/offers';
import { getSupabaseScope } from '@/lib/supabase/scope';
import * as supabaseData from '@/lib/supabase/queries';
import { demoOffers } from '@/lib/demo';
import { isDemoRequest } from '@/lib/hosted';

/**
 * All scraped offers, freshest first (by `lastSeenAt`). Pre-joins `company`
 * and `platform` so call sites can render without a second round-trip.
 * Supabase for signed-in users, fixtures for the hosted demo, nothing otherwise.
 */
export async function readOffers(): Promise<OfferWithRelations[]> {
  const scope = await getSupabaseScope();
  if (scope) return supabaseData.readOffers(scope);
  return (await isDemoRequest()) ? demoOffers() : [];
}

export async function readOffer(id: string): Promise<OfferWithRelations | null> {
  const scope = await getSupabaseScope();
  if (scope) return supabaseData.readOffer(scope, id);
  return (await isDemoRequest()) ? (demoOffers().find((o) => o.id === id) ?? null) : null;
}

export async function readOffersScrapedAt(): Promise<string | null> {
  const scope = await getSupabaseScope();
  if (scope) return supabaseData.readOffersScrapedAt(scope);
  // The newest `lastSeenAt` stands for the most recent scrape.
  return (await isDemoRequest()) ? (demoOffers()[0]?.lastSeenAt ?? null) : null;
}
