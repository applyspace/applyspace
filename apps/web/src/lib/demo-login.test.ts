import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decideDemoLogin, type DemoLoginEnv } from './demo-login.ts';

const KEY = 'k'.repeat(32);
const env = (extra: Partial<DemoLoginEnv> = {}): DemoLoginEnv => ({
  DEMO_LOGIN_ENABLED: '1',
  DEMO_LOGIN_KEY: KEY,
  DEMO_USER_EMAIL: 'demo@example.com',
  DEMO_USER_PASSWORD: 'a-long-password-set-by-the-founder',
  VERCEL_ENV: 'preview',
  ...extra,
});
const ask = (e: DemoLoginEnv, key: string | null = KEY, onDemoHost = false) => decideDemoLogin(e, { key, onDemoHost });
const reason = (d: ReturnType<typeof ask>) => (d.allowed ? 'allowed' : d.reason);

test('allowed on a preview with the right key', () => {
  const d = ask(env());
  assert.equal(d.allowed, true);
  if (d.allowed) assert.equal(d.email, 'demo@example.com');
});

test('allowed locally (no VERCEL_ENV)', () => {
  assert.equal(reason(ask(env({ VERCEL_ENV: undefined }))), 'allowed');
});

test('off unless explicitly enabled', () => {
  assert.equal(reason(ask(env({ DEMO_LOGIN_ENABLED: undefined }))), 'disabled');
  assert.equal(reason(ask(env({ DEMO_LOGIN_ENABLED: 'true' }))), 'disabled');
});

test('never on production, never on the public demo host', () => {
  assert.equal(reason(ask(env({ VERCEL_ENV: 'production' }))), 'production');
  assert.equal(reason(ask(env(), KEY, true)), 'demo-host');
});

test('wrong, missing or short keys are refused', () => {
  assert.equal(reason(ask(env(), 'nope')), 'bad-key');
  assert.equal(reason(ask(env(), null)), 'bad-key');
  assert.equal(reason(ask(env(), '')), 'bad-key');
  assert.equal(reason(ask(env({ DEMO_LOGIN_KEY: 'short' }), 'short')), 'not-configured');
  assert.equal(reason(ask(env({ DEMO_LOGIN_KEY: undefined }), 'x')), 'not-configured');
});

test('the key can only open an account on the reserved demo domain', () => {
  assert.equal(reason(ask(env({ DEMO_USER_EMAIL: 'me@gmail.com' }))), 'bad-email');
  assert.equal(reason(ask(env({ DEMO_USER_EMAIL: 'demo@example.com.evil.io' }))), 'bad-email');
  assert.equal(reason(ask(env({ DEMO_USER_PASSWORD: undefined }))), 'not-configured');
});
