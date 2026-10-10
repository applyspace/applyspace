import { createClient } from '@sanity/client';
import { createImageUrlBuilder } from '@sanity/image-url';
import {
  SANITY_API_VERSION,
  SANITY_DATASET,
  SANITY_PROJECT_ID,
  SANITY_READ_TOKEN,
  isSanityConfigured,
} from './env';

export const sanityClient = isSanityConfigured
  ? createClient({
      projectId: SANITY_PROJECT_ID,
      dataset: SANITY_DATASET,
      apiVersion: SANITY_API_VERSION,
      useCdn: !SANITY_READ_TOKEN,
      token: SANITY_READ_TOKEN || undefined,
    })
  : null;

const builder = sanityClient ? createImageUrlBuilder(sanityClient) : null;

/** Image URL with a width cap and auto format. Returns undefined when Sanity is not configured. */
export function sanityImageUrl(source: unknown, width = 1600): string | undefined {
  if (!builder || !source) return undefined;
  return builder.image(source as never).width(width).auto('format').url();
}

export const SANITY_TAG = 'sanity';
export const REVALIDATE_SECONDS = 300;

/** Fetch with Next caching. Returns null on any failure so callers can fall back to local content. */
export async function sanityFetch<T>(query: string, params: Record<string, unknown> = {}): Promise<T | null> {
  if (!sanityClient) return null;
  try {
    return await sanityClient.fetch<T>(query, params, {
      next: { revalidate: REVALIDATE_SECONDS, tags: [SANITY_TAG] },
    });
  } catch (error) {
    console.error('[sanity] fetch failed, using fallback content', error instanceof Error ? error.message : error);
    return null;
  }
}
