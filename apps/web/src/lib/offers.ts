import { desc, eq } from 'drizzle-orm';
import { offers } from '@apply/db';
import { getDb } from '@/lib/db';
import type { OfferWithRelations } from '@/types/offers';

/**
 * All scraped offers, freshest first (by `lastSeenAt`). Pre-joins `company`
 * and `platform` so call sites can render without a second round-trip.
 */
export async function readOffers(): Promise<OfferWithRelations[]> {
  const db = getDb();
  const rows = await db.query.offers.findMany({
    with: { company: true, platform: true },
    orderBy: desc(offers.lastSeenAt),
  });
  return rows as OfferWithRelations[];
}

export async function readOffer(id: string): Promise<OfferWithRelations | null> {
  const db = getDb();
  const row = await db.query.offers.findFirst({
    with: { company: true, platform: true },
    where: eq(offers.id, id),
  });
  return (row as OfferWithRelations | undefined) ?? null;
}

export async function readOffersScrapedAt(): Promise<string | null> {
  // Treat the newest `lastSeenAt` as the timestamp of the most recent scrape.
  const db = getDb();
  const [row] = await db
    .select({ lastSeenAt: offers.lastSeenAt })
    .from(offers)
    .orderBy(desc(offers.lastSeenAt))
    .limit(1);
  return row?.lastSeenAt ?? null;
}
