import type { OfferWithRelations } from '@apply/core/offers';

export function JobGrid({ offers }: { offers: OfferWithRelations[] }) {
  if (offers.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 text-zinc-400">
        <p className="text-sm">No offers found.</p>
        <p className="text-xs">Run a search to fetch listings.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {offers.map((offer) => (
        <div key={offer.id} className="rounded-xl border border-border p-4 text-sm text-foreground">
          {offer.company.name} — {offer.title}
        </div>
      ))}
    </div>
  );
}
