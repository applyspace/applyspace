import { createHash, timingSafeEqual } from 'node:crypto';
import { isDemoEmail } from '@apply/core/demo-identity';

/**
 * Private way into the demo account on previews and local runs. Every
 * condition below must hold, otherwise the route answers 404 as if it did not
 * exist. Nothing is stored in the repo: all values come from environment
 * variables the founder sets himself (names in docs/demo-account.md).
 */
export interface DemoLoginEnv {
  DEMO_LOGIN_ENABLED?: string;
  DEMO_LOGIN_KEY?: string;
  DEMO_USER_EMAIL?: string;
  DEMO_USER_PASSWORD?: string;
  VERCEL_ENV?: string;
}

export type DemoLoginDecision =
  | { allowed: true; email: string; password: string }
  | { allowed: false; reason: 'disabled' | 'production' | 'demo-host' | 'not-configured' | 'bad-email' | 'bad-key' };

/** Shortest accepted `DEMO_LOGIN_KEY`: long enough that guessing it is not a realistic attack. */
export const MIN_DEMO_KEY_LENGTH = 24;

const digest = (value: string) => createHash('sha256').update(value).digest();

export function decideDemoLogin(
  env: DemoLoginEnv,
  request: { key: string | null; onDemoHost: boolean },
): DemoLoginDecision {
  if (env.DEMO_LOGIN_ENABLED !== '1') return { allowed: false, reason: 'disabled' };
  // Never on the production deployment, and never on the public demo host.
  if (env.VERCEL_ENV === 'production') return { allowed: false, reason: 'production' };
  if (request.onDemoHost) return { allowed: false, reason: 'demo-host' };

  const { DEMO_LOGIN_KEY: key, DEMO_USER_EMAIL: email, DEMO_USER_PASSWORD: password } = env;
  if (!key || key.length < MIN_DEMO_KEY_LENGTH || !email || !password) return { allowed: false, reason: 'not-configured' };
  // The key can only ever open an account on the reserved demo domain, never a real one.
  if (!isDemoEmail(email)) return { allowed: false, reason: 'bad-email' };

  // Compare digests in constant time (equal length, no early exit on the first differing byte).
  if (!request.key || !timingSafeEqual(digest(request.key), digest(key))) return { allowed: false, reason: 'bad-key' };
  return { allowed: true, email, password };
}
