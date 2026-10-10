import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createAnalytics, type AnalyticsClient, type ConsentStatus } from './analytics.ts';

/** Mirrors posthog-js with `opt_out_capturing_by_default`: pending until a choice, reset() clears it. */
function fakeClient() {
  const calls: Array<[string, ...unknown[]]> = [];
  let consent: ConsentStatus = 'pending';
  const client: AnalyticsClient = {
    capture: (e, p) => { if (consent === 'granted') calls.push(['capture', e, p]); },
    identify: (id, p) => { if (consent === 'granted') calls.push(['identify', id, p]); },
    setPersonProperties: (p) => { calls.push(['person', p]); },
    reset: () => { calls.push(['reset']); consent = 'pending'; },
    register: (p) => { calls.push(['register', p]); },
    opt_in_capturing: () => { consent = 'granted'; },
    opt_out_capturing: () => { consent = 'denied'; },
    get_explicit_consent_status: () => consent,
  };
  return { client, calls };
}

test('consent defaults to off: nothing is captured or identified before accept', () => {
  const { client, calls } = fakeClient();
  const a = createAnalytics(client, () => 'web');
  assert.equal(a.consentStatus(), 'pending');
  assert.equal(a.hasConsent(), false);
  a.capture('offer_declined');
  a.identify({ id: 'u1' }, { locale: 'fr' });
  a.setPlan('plus');
  a.registerPlatform();
  assert.deepEqual(calls, []);
});

test('accept starts capture; the choice survives reset (sign-out)', () => {
  const { client, calls } = fakeClient();
  const a = createAnalytics(client, () => 'web');
  a.setConsent(true);
  a.capture('onboarding_plan_selected', { plan: 'plus' });
  a.capture('offer_declined');
  assert.deepEqual(calls, [
    ['capture', 'onboarding_plan_selected', { plan: 'plus' }],
    ['capture', 'offer_declined', undefined],
  ]);
  a.reset();
  assert.equal(a.hasConsent(), true);
});

test('declined choice also survives reset and stays off', () => {
  const { client } = fakeClient();
  const a = createAnalytics(client, () => 'web');
  a.setConsent(false);
  a.reset();
  assert.equal(a.consentStatus(), 'denied');
});

test('identify sends the user id and email, never the name', () => {
  const { client, calls } = fakeClient();
  const a = createAnalytics(client, () => 'desktop');
  a.setConsent(true);
  a.setPlan('plus');
  calls.length = 0;
  // The email is allowed (founder decision); the name must never reach PostHog, even if a caller passes the full user.
  a.identify({ id: 'u1', email: 'a@b.c', name: 'Ada' } as { id: string; email: string }, { locale: 'fr' });
  assert.deepEqual(calls[0], ['register', { app_platform: 'desktop' }]);
  assert.deepEqual(calls[1], ['identify', 'u1', { app_platform: 'desktop', locale: 'fr', plan: 'plus', email: 'a@b.c' }]);
  assert.ok(!JSON.stringify(calls).includes('Ada'));
});

test('reset clears the identity and re-tags the platform', () => {
  const { client, calls } = fakeClient();
  const a = createAnalytics(client, () => 'web');
  a.setConsent(true);
  a.reset();
  assert.deepEqual(calls, [['reset'], ['register', { app_platform: 'web' }]]);
});

test('opt-out stops capture and resets the identity; opt-in resumes', () => {
  const { client, calls } = fakeClient();
  const a = createAnalytics(client, () => 'web');
  a.setConsent(true);
  a.setConsent(false);
  assert.equal(a.hasConsent(), false);
  a.capture('offer_declined');
  assert.deepEqual(calls, [['reset']]);
  a.setConsent(true);
  a.capture('offer_declined');
  assert.equal(calls.length, 2);
});

test('subscribers are notified on consent changes', () => {
  const { client } = fakeClient();
  const a = createAnalytics(client, () => 'web');
  let n = 0;
  const off = a.subscribeConsent(() => { n++; });
  a.setConsent(true);
  off();
  a.setConsent(false);
  assert.equal(n, 1);
});

test('a client that is not initialised captures nothing', () => {
  const { client } = fakeClient();
  client.get_explicit_consent_status = () => { throw new Error('not loaded'); };
  const a = createAnalytics(client, () => 'web');
  assert.equal(a.consentStatus(), 'denied');
  a.capture('offer_declined');
});

test('blocked (demo) sessions send nothing and hide the prompt, even after an earlier accept', () => {
  const { client, calls } = fakeClient();
  const a = createAnalytics(client, () => 'web');
  a.setConsent(true);
  calls.length = 0;
  a.setBlocked(true);
  assert.equal(a.consentStatus(), 'denied');
  assert.equal(a.hasConsent(), false);
  a.capture('offer_declined');
  a.identify({ id: 'demo-user' }, { locale: 'fr' });
  a.setPlan('max');
  a.registerPlatform();
  a.setConsent(true); // the banner and the Settings switch cannot turn it back on
  assert.deepEqual(calls, []);
  assert.equal(client.get_explicit_consent_status(), 'denied'); // posthog itself is opted out
});

test('unblocking restores the previous choice instead of asking again or forgetting it', () => {
  const accepted = fakeClient();
  const a = createAnalytics(accepted.client, () => 'web');
  a.setConsent(true);
  a.setBlocked(true);
  a.reset(); // signing out of the demo account must not store a refusal
  a.setBlocked(false);
  assert.equal(a.consentStatus(), 'granted');

  const pending = fakeClient();
  const b = createAnalytics(pending.client, () => 'web');
  b.setBlocked(true);
  b.setBlocked(false);
  assert.equal(b.consentStatus(), 'pending');
});

test('blocking notifies subscribers once per change', () => {
  const { client } = fakeClient();
  const a = createAnalytics(client, () => 'web');
  let n = 0;
  a.subscribeConsent(() => { n++; });
  a.setBlocked(true);
  a.setBlocked(true);
  a.setBlocked(false);
  assert.equal(n, 2);
});

test('applications and resume events pass through with only enum and count properties', () => {
  const { client, calls } = fakeClient();
  const a = createAnalytics(client, () => 'web');
  a.capture('application_status_changed', { from_status: 'waiting', to_status: 'interviewing', layout: 'board' });
  assert.deepEqual(calls, [], 'nothing before consent');
  a.setConsent(true);
  a.capture('application_status_changed', { from_status: 'waiting', to_status: 'interviewing', layout: 'board' });
  a.capture('applications_layout_changed', { from_layout: 'board', to_layout: 'table' });
  a.capture('application_created', { source: 'manual' });
  a.capture('resume_import_confirmed', { context: 'onboarding', sections_count: 3 });
  a.capture('onboarding_import_save_failed', { reason: 'profile' });
  assert.equal(calls.length, 5);
  for (const call of calls) {
    for (const value of Object.values(call[2] as Record<string, unknown>)) {
      assert.ok(typeof value === 'number' || /^[a-z_-]+$/.test(String(value)), 'no free text');
    }
  }
});
