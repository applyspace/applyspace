/**
 * Brandfetch Logo API: company logos by domain, served from their CDN.
 * The client id is public by design (it appears in every image URL); it can be
 * overridden with NEXT_PUBLIC_BRANDFETCH_CLIENT_ID.
 */
const CLIENT_ID = process.env.NEXT_PUBLIC_BRANDFETCH_CLIENT_ID ?? "1idEY8aGXLTnARocSIz";

export function brandLogoUrl(domain: string): string {
  return `https://cdn.brandfetch.io/${domain}?c=${CLIENT_ID}`;
}

/** Square brand symbol (the mark without the wordmark) for a domain, sized for small round avatars. */
export function brandSymbolUrl(domain: string): string {
  return `https://cdn.brandfetch.io/${domain}/w/96/h/96/symbol?c=${CLIENT_ID}`;
}

/** Square app-style icon for a domain, used as the logo of platforms and tools. */
export function brandIconUrl(domain: string): string {
  return `https://cdn.brandfetch.io/${domain}/w/96/h/96/icon?c=${CLIENT_ID}`;
}

/** A specific library asset (SVG) of a brand, addressed by brand id + asset id. */
export function brandAssetUrl(brandId: string, assetId: string): string {
  return `https://cdn.brandfetch.io/${brandId}/theme/dark/${assetId}.svg?c=${CLIENT_ID}`;
}
