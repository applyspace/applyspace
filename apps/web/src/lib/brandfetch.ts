/**
 * Brandfetch Logo API: company logos by domain, served from their CDN.
 * Uses the simplified brand mark (`symbol`), light theme, at 2x for a 64px tile.
 * `fallback/404` makes a missing brand fail the request so the UI can show its
 * own fallback. The CDN serves WebP; SVG is only offered for some fallbacks.
 * The client id is public by design (it appears in every image URL); it can be
 * overridden with NEXT_PUBLIC_BRANDFETCH_CLIENT_ID.
 */
const CLIENT_ID = process.env.NEXT_PUBLIC_BRANDFETCH_CLIENT_ID ?? "1idEY8aGXLTnARocSIz";

export function brandLogoUrl(domain: string): string {
  return `https://cdn.brandfetch.io/domain/${domain}/w/256/h/256/theme/light/fallback/404/type/symbol?c=${CLIENT_ID}`;
}

/** Default Brandfetch logo, used when a brand has no simplified symbol. */
export function brandLogoFallbackUrl(domain: string): string {
  return `https://cdn.brandfetch.io/${domain}?c=${CLIENT_ID}`;
}
