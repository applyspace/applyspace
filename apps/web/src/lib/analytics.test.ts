import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createAnalytics, type AnalyticsClient } from './analytics.ts';

function fakeClient() {
  const calls: Array<[string, ...unknown[]]> = [];
  let optedOut = false;
  const client: AnalyticsClient = {
    // Mirrors posthog-js: nothing is captured while opted out.
    capture: (e, p) => { if (!optedOut) calls.push(['capture', e, p]); },
    identify: (id, p) => { calls.push(['identify', id, p]); },
    reset: () => { calls.push(['reset']); },
    register: (p) => { calls.push(['register', p]); },
    opt_in_capturing: () => { optedOut = false; },
    opt_out_capturing: () => { optedOut = true; },
    has_opted_out_capturing: () => optedOut,
  };
  return { client, calls };
}

test('capture forwards name and typed properties', () => {
  const { client, calls } = fakeClient();
  const a = createAnalytics(client, () => 'web');
  a.capture('onboarding_plan_selected', { plan: 'plus' });
  a.capture('offer_declined');
  assert.deepEqual(calls, [
    ['capture', 'onboarding_plan_selected', { plan: 'plus' }],
    ['capture', 'offer_declined', undefined],
  ]);
});

test('identify uses the user id and tags the platform', () => {
  const { client, calls } = fakeClient();
  createAnalytics(client, () => 'desktop').identify({ id: 'u1', email: 'a@b.c' });
  assert.deepEqual(calls[0], ['register', { app_platform: 'desktop' }]);
  assert.deepEqual(calls[1], ['identify', 'u1', { email: 'a@b.c', name: undefined }]);
});

test('reset clears the identity and re-tags the platform', () => {
  const { client, calls } = fakeClient();
  createAnalytics(client, () => 'web').reset();
  assert.deepEqual(calls, [['reset'], ['register', { app_platform: 'web' }]]);
});

test('opt-out stops capture, opt-in resumes it', () => {
  const { client, calls } = fakeClient();
  const a = createAnalytics(client, () => 'web');
  assert.equal(a.hasConsent(), true);
  a.setConsent(false);
  assert.equal(a.hasConsent(), false);
  a.capture('offer_declined');
  assert.equal(calls.length, 0);
  a.setConsent(true);
  a.capture('offer_declined');
  assert.equal(calls.length, 1);
});
