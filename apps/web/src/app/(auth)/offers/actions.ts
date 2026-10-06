'use server';

import { revalidatePath } from 'next/cache';
import type { Search } from '@apply/db';
import { getConnector } from '@/lib/connectors';
import { getSupabaseScope } from '@/lib/supabase/scope';
import { selectById } from '@/lib/supabase/rows';
import { saveOffers } from '@/lib/supabase/saveOffers';

export type RunSearchResult =
  | { ok: true; found: number; inserted: number; updated: number }
  | { ok: false; reason: 'signed-out' | 'not-found' | 'unavailable' | 'failed'; message: string };

/** Platform used when a search lists none. */
const DEFAULT_PLATFORM = 'wttj';

/**
 * Runs one search through its platform connector and saves the offers for the
 * signed-in user. Never throws to the client. Ownership is enforced by RLS:
 * a search of another user reads as not found.
 */
export async function runSearch(searchId: string): Promise<RunSearchResult> {
  const scope = await getSupabaseScope();
  if (!scope) {
    return { ok: false, reason: 'signed-out', message: 'Sign in to search for offers.' };
  }

  try {
    const search = await selectById<Search>(scope, 'searches', searchId);
    if (!search) return { ok: false, reason: 'not-found', message: 'This search no longer exists.' };

    const platform = search.enabledPlatforms?.includes(DEFAULT_PLATFORM) || !search.enabledPlatforms?.length
      ? DEFAULT_PLATFORM
      : search.enabledPlatforms[0];
    const connector = getConnector(platform);
    if (!connector) {
      return { ok: false, reason: 'unavailable', message: 'This platform is not supported yet.' };
    }

    const result = await connector.searchOffers(search);
    if (result.status === 'unavailable') {
      return { ok: false, reason: 'unavailable', message: result.message };
    }
    if (result.status === 'error') {
      return { ok: false, reason: 'failed', message: result.message };
    }

    const saved = await saveOffers(scope, connector.slug, result.offers);

    // Best effort: the column comes with migration 20261011000000.
    await scope.supabase
      .from('searches')
      .update({ last_run_at: new Date().toISOString() })
      .eq('id', search.id);

    revalidatePath('/offers', 'layout');
    return { ok: true, found: result.offers.length, ...saved };
  } catch (error) {
    console.error('[offers] runSearch failed:', error);
    return {
      ok: false,
      reason: 'failed',
      message: 'The search failed. Please try again.',
    };
  }
}
