/**
 * URL-safe slug from an arbitrary string.
 * - lowercases
 * - strips diacritics (é → e)
 * - non-alphanumeric runs → `-`
 * - trims leading/trailing `-`
 */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Build a `<slug>-<id>` URL segment from human-readable parts.
 * Example: entrySlug(['Product Designer', 'Paris'], 'og-01') → 'product-designer-paris-og-01'
 */
export function entrySlug(parts: Array<string | undefined | null>, id: string): string {
  const joined = parts.filter(Boolean).join(' ');
  const base = slugify(joined);
  return base ? `${base}-${id}` : id;
}

/** Extract an id from a `<slug>-<id>` URL segment. Returns whatever is after the last `-`. */
export function idFromSlug(slug: string): string {
  const parts = slug.split('-');
  return parts[parts.length - 1] ?? slug;
}

/**
 * Extract the full id when the id itself may contain `-` (e.g. `prd-01`).
 * Matches the longest suffix that equals one of the provided ids.
 */
export function matchIdInSlug(slug: string, ids: string[]): string | undefined {
  return ids.find((id) => slug === id || slug.endsWith(`-${id}`));
}
