import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { AuthCallbackPayload } from '../shared/ipc.js';
import { REDELIVERY_ATTEMPTS, REDELIVERY_INTERVAL_MS, type WindowFacts, createAuthCoordinator } from './authCoordinator.js';

const CODE = '3f2a9c1e-7b4d-4e8a-9d52-0c6f1a8b7e34';
const LINK = `applyspace://auth/callback?code=${CODE}`;

function setup(initial: Partial<WindowFacts> = {}) {
  const sent: AuthCallbackPayload[] = [];
  const logs: string[] = [];
  const timers = new Map<number, { fn: () => void; ms: number }>();
  let nextTimer = 1;
  let focused = 0;
  const state = {
    windowAlive: true,
    facts: { hasWindow: true, loaded: true, legacyReady: true, inPlaceNavs: 0, msSinceLoad: 50, ...initial } as WindowFacts,
  };
  const auth = createAuthCoordinator({
    send: (p) => {
      if (!state.windowAlive) return false;
      sent.push(p);
      return true;
    },
    focus: () => {
      focused += 1;
    },
    log: (event, fields = {}) => {
      logs.push(`${event} ${Object.entries(fields).map(([k, v]) => `${k}=${v}`).join(' ')}`);
    },
    windowFacts: () => state.facts,
    setTimer: (fn, ms) => {
      const id = nextTimer++;
      timers.set(id, { fn, ms });
      return id;
    },
    clearTimer: (h) => {
      timers.delete(h as number);
    },
  });
  /** Fire the single pending timer, if any. */
  const tick = () => {
    const [id, t] = [...timers][0] ?? [];
    if (id === undefined || !t) return false;
    timers.delete(id);
    t.fn();
    return true;
  };
  return { auth, sent, logs, state, timers, tick, focused: () => focused };
}

test('regression: the push is sent even when the old rendererReady flag is false', () => {
  // Next.js replaceState after did-finish-load: Electron reports an in-page navigation, the old
  // flag went false and the link was only stored. Delivery must not depend on it.
  const t = setup({ legacyReady: false, inPlaceNavs: 1 });
  t.auth.handleLink(LINK, 'macos-open-url');
  assert.deepEqual(t.sent, [{ code: CODE }]);
  assert.match(t.logs[0], /^deep-link .*legacyReady=false.*inPlaceNavs=1/);
  assert.equal(t.focused(), 1);
});

test('the callback survives until the renderer takes it, exactly once', () => {
  const t = setup();
  t.auth.handleLink(LINK, 'macos-open-url');
  assert.deepEqual(t.auth.take(), { code: CODE });
  assert.equal(t.auth.take(), null);
});

test('a link received before any window exists is delivered when the page has loaded', () => {
  const t = setup({ hasWindow: false, loaded: false, legacyReady: false, msSinceLoad: null });
  t.state.windowAlive = false;
  t.auth.handleLink(LINK, 'cold-start');
  assert.deepEqual(t.sent, []);
  t.state.windowAlive = true;
  t.auth.onPageLoaded();
  assert.deepEqual(t.sent, [{ code: CODE }]);
});

test('the wake-up is repeated while nobody takes the callback, then stops', () => {
  const t = setup();
  t.auth.handleLink(LINK, 'macos-open-url');
  assert.equal(t.sent.length, 1);
  let ticks = 0;
  while (t.tick()) ticks += 1;
  assert.equal(ticks, REDELIVERY_ATTEMPTS + 1);
  assert.equal(t.sent.length, 1 + REDELIVERY_ATTEMPTS);
  assert.ok(t.logs.some((l) => l.startsWith('gave-up')));
  // Still there for the next mount or window focus.
  assert.deepEqual(t.auth.take(), { code: CODE });
});

test('taking the callback cancels the repeated wake-up', () => {
  const t = setup();
  t.auth.handleLink(LINK, 'macos-open-url');
  t.auth.take();
  assert.equal(t.timers.size, 0);
  assert.equal(t.tick(), false);
  assert.equal(t.sent.length, 1);
});

test('the repeat interval is short enough to matter', () => {
  const t = setup();
  t.auth.handleLink(LINK, 'macos-open-url');
  assert.equal([...t.timers.values()][0].ms, REDELIVERY_INTERVAL_MS);
});

test('a second copy of the same link is dropped once consumed, without waking the renderer', () => {
  const t = setup();
  t.auth.handleLink(LINK, 'macos-open-url');
  t.auth.take();
  t.sent.length = 0;
  t.auth.handleLink(LINK, 'macos-open-url');
  assert.deepEqual(t.sent, []);
  assert.equal(t.auth.take(), null);
  assert.ok(t.logs.some((l) => l.includes('outcome=duplicate')));
});

test('a second copy while the first still waits wakes the renderer again', () => {
  const t = setup();
  t.auth.handleLink(LINK, 'macos-open-url');
  t.auth.handleLink(LINK, 'macos-open-url');
  assert.equal(t.sent.length, 2);
  assert.deepEqual(t.auth.take(), { code: CODE });
});

test('reset (new sign-in or sign-out) drops a stale callback and cancels the wake-up', () => {
  const t = setup();
  t.auth.handleLink(LINK, 'macos-open-url');
  t.auth.reset();
  assert.equal(t.auth.take(), null);
  assert.equal(t.timers.size, 0);
  // The stale code can not come back through a late click on the old bridge page.
  t.auth.handleLink(LINK, 'macos-open-url');
  assert.equal(t.auth.take(), null);
});

test('links that are not ours are ignored and logged by length only', () => {
  const t = setup();
  t.auth.handleLink('applyspace://something/else?code=' + CODE, 'macos-open-url');
  assert.deepEqual(t.sent, []);
  assert.match(t.logs[0], /^deep-link-ignored source=macos-open-url rawLength=\d+$/);
  assert.ok(!t.logs.join('\n').includes(CODE));
});

test('the log never contains the code', () => {
  const t = setup();
  t.auth.handleLink(LINK, 'macos-open-url');
  t.auth.take();
  assert.ok(!t.logs.join('\n').includes(CODE));
  assert.match(t.logs[0], /codeLength=36/);
});

test('a callback with no code is delivered as a failure flag', () => {
  const t = setup();
  t.auth.handleLink('applyspace://auth/callback', 'macos-open-url');
  assert.deepEqual(t.sent, [{ error: true }]);
});
