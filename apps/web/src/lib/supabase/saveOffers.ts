import type { ConnectorOffer } from '@/lib/connectors';
import type { SupabaseScope } from './scope';

const CHUNK = 100;
const CONTRACTS = ['CDI', 'CDD', 'Stage', 'Freelance', 'Apprentissage'];

function chunks<T>(items: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += CHUNK) out.push(items.slice(i, i + CHUNK));
  return out;
}

function toRemoteMode(location: string): 'onsite' | 'hybrid' | 'remote' | null {
  const l = location.toLowerCase();
  if (l.includes('hybride') || l.includes('hybrid')) return 'hybrid';
  if (l.includes('sur site') || l.includes('onsite') || l.includes('on site')) return 'onsite';
  if (l.includes('distance') || l.includes('remote') || l.includes('télétravail')) return 'remote';
  return null;
}

/** "45K à 60K €" → { min: 45000, max: 60000 }. Best effort; the raw text is kept too. */
function toSalary(raw: string | undefined): { min: number | null; max: number | null } {
  if (!raw) return { min: null, max: null };
  const nums = [...raw.toLowerCase().replace(/\s+/g, '').matchAll(/(\d{2,3})k/g)].map(
    (m) => Number(m[1]) * 1000,
  );
  return { min: nums[0] ?? null, max: nums[1] ?? null };
}

export interface SaveOffersResult {
  inserted: number;
  updated: number;
}

/**
 * Saves connector offers for the signed-in user: companies deduplicated by
 * name, offers upserted on (user, platform, external id). Re-seen offers keep
 * their `user_status` and `first_seen_at`. Throws on a Supabase error.
 */
export async function saveOffers(
  { supabase, userId }: SupabaseScope,
  platformSlug: string,
  found: ConnectorOffer[],
): Promise<SaveOffersResult> {
  // One row per external id (last one wins); skip rows we cannot store.
  const byId = new Map<string, ConnectorOffer>();
  for (const o of found) {
    if (o.externalId && o.url && o.title && o.company?.trim()) byId.set(o.externalId, o);
  }
  const list = [...byId.values()];
  if (list.length === 0) return { inserted: 0, updated: 0 };

  const { data: platform, error: platformError } = await supabase
    .from('platforms')
    .select('slug')
    .eq('slug', platformSlug)
    .maybeSingle();
  if (platformError) throw new Error(`Supabase platforms: ${platformError.message}`);
  if (!platform) throw new Error(`Unknown platform "${platformSlug}"`);

  // Companies: insert the missing ones, then read every id back by name.
  const names = [...new Set(list.map((o) => o.company.trim()))];
  const { error: companyError } = await supabase
    .from('companies')
    .upsert(
      names.map((name) => ({ user_id: userId, name })),
      { onConflict: 'user_id,name', ignoreDuplicates: true },
    );
  if (companyError) throw new Error(`Supabase companies: ${companyError.message}`);

  const companyIds = new Map<string, string>();
  for (const part of chunks(names)) {
    const { data, error } = await supabase.from('companies').select('id, name').in('name', part);
    if (error) throw new Error(`Supabase companies: ${error.message}`);
    for (const row of data ?? []) companyIds.set(row.name as string, row.id as string);
  }

  // Count what already exists to tell new offers from refreshed ones.
  const existing = new Set<string>();
  for (const part of chunks(list)) {
    const { data, error } = await supabase
      .from('offers')
      .select('external_id')
      .eq('platform_slug', platformSlug)
      .in(
        'external_id',
        part.map((o) => o.externalId),
      );
    if (error) throw new Error(`Supabase offers: ${error.message}`);
    for (const row of data ?? []) existing.add(row.external_id as string);
  }

  const now = new Date().toISOString();
  const rows = list.flatMap((o) => {
    const companyId = companyIds.get(o.company.trim());
    if (!companyId) return [];
    const location = o.location ?? '';
    const salary = toSalary(o.salary);
    return [
      {
        user_id: userId,
        platform_slug: platformSlug,
        company_id: companyId,
        external_id: o.externalId,
        url: o.url,
        title: o.title,
        location,
        remote_mode: toRemoteMode(location),
        contract: o.contract && CONTRACTS.includes(o.contract) ? o.contract : null,
        salary_min_eur: salary.min,
        salary_max_eur: salary.max,
        salary_raw: o.salary ?? null,
        description: o.description ?? '',
        posted_at: o.postedAt ?? null,
        last_seen_at: now,
        updated_at: now,
      },
    ];
  });

  for (const part of chunks(rows)) {
    const { error } = await supabase
      .from('offers')
      .upsert(part, { onConflict: 'user_id,platform_slug,external_id' });
    if (error) throw new Error(`Supabase offers: ${error.message}`);
  }

  const updated = rows.filter((r) => existing.has(r.external_id)).length;
  return { inserted: rows.length - updated, updated };
}
