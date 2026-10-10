/**
 * Who the demo account is. Kept apart from the dataset so the web app can
 * import it without pulling the fixtures into its bundle.
 *
 * The demo user always lives on the reserved domain `example.com` (RFC 2606):
 * it can never be a real person's address, which is what lets the app treat
 * it differently (no analytics, preview sign-in only) without any list of ids.
 */

/** Reserved domain every demo account email must use. */
export const DEMO_EMAIL_DOMAIN = 'example.com';

/** Email used by the generated SQL when the founder does not pick another one. */
export const DEFAULT_DEMO_EMAIL = `demo@${DEMO_EMAIL_DOMAIN}`;

/** True for an email on the reserved demo domain (case-insensitive, exact domain). */
export function isDemoEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const at = email.lastIndexOf('@');
  return at > 0 && email.slice(at + 1).trim().toLowerCase() === DEMO_EMAIL_DOMAIN;
}
