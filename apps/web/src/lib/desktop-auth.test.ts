import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { DesktopAuthCallback, DesktopAuthReport } from './desktop.ts';
import { createDesktopAuthController, type DesktopAuthStatus, type ExchangeResult } from './desktop-auth.ts';

const CODE = '3f2a9c1e-7b4d-4e8a-9d52-0c6f1a8b7e34';

function setup(opts: { payloads?: Array<DesktopAuthCallback | null>; exchange?: (code: string) => Promise<ExchangeResult>; timeoutMs?: number } = {}) {
  const queue = [...(opts.payloads ?? [{ code: CODE }])];
  const reports: DesktopAuthReport[] = [];
  const statuses: DesktopAuthStatus[] = [];
  const exchanged: string[] = [];
  let signedIn = 0;
  const controller = createDesktopAuthController({
    bridge: {
      takeAuthCallback: async () => queue.shift() ?? null,
      reportAuth: (r) => reports.push(r),
    },
    exchange: async (code) => {
      exchanged.push(code);
      return (opts.exchange ?? (async () => ({ error: null })))(code);
    },
    setStatus: (s) => statuses.push(s),
    onSignedIn: () => {
      signedIn += 1;
    },
    timeoutMs: opts.timeoutMs ?? 50,
  });
  return { controller, reports, statuses, exchanged, signedIn: () => signedIn };
}

test('takes the waiting callback, exchanges the code and signs in', async () => {
  const t = setup();
  await t.controller.consume();
  assert.deepEqual(t.exchanged, [CODE]);
  assert.equal(t.signedIn(), 1);
  assert.deepEqual(t.statuses, [{ kind: 'working' }]);
  assert.deepEqual(t.reports.map((r) => r.stage), ['callback-taken', 'exchange-start', 'exchange-ok']);
});

test('does nothing when no callback is waiting (page mount, window focus)', async () => {
  const t = setup({ payloads: [] });
  await t.controller.consume();
  assert.deepEqual(t.exchanged, []);
  assert.deepEqual(t.statuses, []);
  assert.deepEqual(t.reports, []);
});

test('a missed push is recovered by the next trigger (window focus)', async () => {
  // The shell's push was dropped; the callback is still waiting when the window gets focus.
  const t = setup({ payloads: [null, { code: CODE }] });
  await t.controller.consume(); // page mount: nothing yet
  await t.controller.consume(); // focus: now there is
  assert.deepEqual(t.exchanged, [CODE]);
  assert.equal(t.signedIn(), 1);
});

test('two triggers at once exchange the code only once', async () => {
  const t = setup({ payloads: [{ code: CODE }, { code: CODE }] });
  await Promise.all([t.controller.consume(), t.controller.consume()]);
  assert.equal(t.exchanged.length, 1);
  assert.equal(t.signedIn(), 1);
});

test('a failure flag from the shell is shown, not swallowed', async () => {
  const t = setup({ payloads: [{ error: true }] });
  await t.controller.consume();
  assert.deepEqual(t.exchanged, []);
  assert.equal(t.statuses.at(-1)?.kind, 'error');
  assert.deepEqual(t.reports.map((r) => r.stage), ['callback-invalid']);
});

test('a Supabase error is shown with its name and reported by name and status only', async () => {
  const t = setup({
    exchange: async () => ({
      error: { name: 'AuthPKCECodeVerifierMissingError', message: 'PKCE code verifier not found in storage.', status: 400 },
    }),
  });
  await t.controller.consume();
  assert.equal(t.signedIn(), 0);
  assert.deepEqual(t.statuses.at(-1), {
    kind: 'error',
    detail: 'AuthPKCECodeVerifierMissingError: PKCE code verifier not found in storage.',
  });
  const last = t.reports.at(-1);
  assert.deepEqual(last, { stage: 'exchange-error', errorName: 'AuthPKCECodeVerifierMissingError', status: 400 });
  assert.ok(!JSON.stringify(t.reports).includes(CODE));
});

test('a hanging exchange times out with a visible error', async () => {
  const t = setup({ exchange: () => new Promise<ExchangeResult>(() => {}), timeoutMs: 20 });
  await t.controller.consume();
  assert.equal(t.signedIn(), 0);
  assert.deepEqual(t.statuses.at(-1), { kind: 'error', detail: 'Timed out waiting for Supabase.' });
  assert.equal(t.reports.at(-1)?.stage, 'exchange-timeout');
});

test('a network failure is shown and reported', async () => {
  const t = setup({
    exchange: async () => {
      throw new TypeError('Failed to fetch');
    },
  });
  await t.controller.consume();
  assert.deepEqual(t.statuses.at(-1), { kind: 'error', detail: 'Failed to fetch' });
  assert.deepEqual(t.reports.at(-1), { stage: 'exchange-error', errorName: 'TypeError' });
});

test('after a failure a later callback (new attempt) is handled', async () => {
  let first = true;
  const t = setup({
    payloads: [{ code: CODE }, { code: 'bbbbbbbb-2222-3333-4444-555555555555' }],
    exchange: async () => {
      if (first) {
        first = false;
        return { error: { name: 'AuthApiError', message: 'invalid flow state', status: 400 } };
      }
      return { error: null };
    },
  });
  await t.controller.consume();
  await t.controller.consume();
  assert.equal(t.exchanged.length, 2);
  assert.equal(t.signedIn(), 1);
});

test('works with a shell that has no auth log (reportAuth absent)', async () => {
  const exchanged: string[] = [];
  const controller = createDesktopAuthController({
    bridge: { takeAuthCallback: async () => ({ code: CODE }) },
    exchange: async (c) => {
      exchanged.push(c);
      return { error: null };
    },
    setStatus: () => {},
    onSignedIn: () => {},
  });
  await controller.consume();
  assert.deepEqual(exchanged, [CODE]);
});
