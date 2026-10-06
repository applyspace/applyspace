/**
 * Brandfetch Logo API: company logos by domain, served from their CDN.
 * The client id is public by design (it appears in every image URL); it can be
 * overridden with NEXT_PUBLIC_BRANDFETCH_CLIENT_ID.
 */
const CLIENT_ID = process.env.NEXT_PUBLIC_BRANDFETCH_CLIENT_ID ?? "1idEY8aGXLTnARocSIz";

export function brandLogoUrl(domain: string): string {
  return `https://cdn.brandfetch.io/${domain}?c=${CLIENT_ID}`;
}
