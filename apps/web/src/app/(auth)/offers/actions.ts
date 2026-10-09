'use server';

import { revalidatePath } from 'next/cache';
import { EXPERIENCE_LEVEL_VALUES, type Search } from '@apply/db';
import * as candidate from '@/lib/candidate-profile';
import { getConnector } from '@/lib/connectors';
import { getSupabaseScope } from '@/lib/supabase/scope';
import { selectById } from '@/lib/supabase/rows';
import { saveOffers } from '@/lib/supabase/saveOffers';
import {
  CONTRACT_TOKENS,
  type CreateSearchResult,
  type NewSearchInput,
} from '@apply/core/candidate-profile';

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

const PLAN_LIMIT_MESSAGE =
  'Free includes one search profile. Plus gives each job title its own search.';

/**
 * Creates one more search profile for the signed-in user. Never throws to the
 * client: the result is typed, with `reason: 'plan-limit'` when the Free plan
 * already has its one search (checked here and again by the database trigger).
 */
export async function createSearch(input: NewSearchInput): Promise<CreateSearchResult> {
  const scope = await getSupabaseScope();
  if (!scope) {
    return { ok: false, reason: 'signed-out', message: 'Sign in to create a search.' };
  }

  const title = (input.title ?? '').trim();
  if (!title) return { ok: false, reason: 'invalid', message: 'Add a job title.' };
  if (title.length > 120) {
    return { ok: false, reason: 'invalid', message: 'The job title is too long.' };
  }

  try {
    const data = await candidate.insertSearch(scope, {
      title,
      location: (input.location ?? '').trim().slice(0, 120),
      // Only canonical tokens reach the database (CHECK constraints).
      contractTypes: Array.from(new Set(input.contractTypes ?? [])).filter((c) =>
        CONTRACT_TOKENS.includes(c),
      ),
      experienceLevels: Array.from(new Set(input.experienceLevels ?? [])).filter((l) =>
        EXPERIENCE_LEVEL_VALUES.includes(l),
      ),
    });
    return { ok: true, data };
  } catch (error) {
    if (error instanceof candidate.PlanLimitError) {
      return { ok: false, reason: 'plan-limit', message: PLAN_LIMIT_MESSAGE };
    }
    if (error instanceof candidate.InvalidInputError) {
      return { ok: false, reason: 'invalid', message: error.message };
    }
    console.error('[searches] creating a search failed:', error);
    return {
      ok: false,
      reason: 'unavailable',
      message: 'This is not available yet. Please try again later.',

    };
  }
}
