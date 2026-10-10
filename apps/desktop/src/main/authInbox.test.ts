import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createAuthInbox } from './authInbox.js';

const A = { code: 'aaaaaaaa-1111' };
const B = { code: 'bbbbbbbb-2222' };

test('keeps a callback until it is taken, then empties', () => {
  const inbox = createAuthInbox();
  assert.equal(inbox.receive(A), 'stored');
  assert.equal(inbox.hasPending(), true);
  assert.deepEqual(inbox.peek(), A);
  assert.deepEqual(inbox.take(), A);
  assert.equal(inbox.take(), null);
  assert.equal(inbox.hasPending(), false);
});

test('a code received twice (automatic open + button click) is only accepted once', () => {
  const inbox = createAuthInbox();
  assert.equal(inbox.receive(A), 'stored');
  assert.equal(inbox.receive(A), 'duplicate');
  assert.deepEqual(inbox.take(), A);
  // The second copy arrives after the first was consumed: it must not become a stale pending callback.
  assert.equal(inbox.receive(A), 'duplicate');
  assert.equal(inbox.hasPending(), false);
});

test('a duplicate does not disturb a different waiting callback', () => {
  const inbox = createAuthInbox();
  inbox.receive(A);
  inbox.take();
  inbox.receive(B);
  assert.equal(inbox.receive(A), 'duplicate');
  assert.deepEqual(inbox.peek(), B);
});

test('reset forgets a waiting callback but not the codes already seen', () => {
  const inbox = createAuthInbox();
  inbox.receive(A);
  assert.equal(inbox.reset(), true);
  assert.equal(inbox.hasPending(), false);
  assert.equal(inbox.reset(), false);
  // A late click on the old bridge page must not leak into the next sign-in.
  assert.equal(inbox.receive(A), 'duplicate');
});

test('failure flags have no code and are always stored', () => {
  const inbox = createAuthInbox();
  assert.equal(inbox.receive({ error: true }), 'stored');
  assert.equal(inbox.receive({ error: true }), 'stored');
  assert.deepEqual(inbox.take(), { error: true });
});

test('remembers a bounded number of codes', () => {
  const inbox = createAuthInbox();
  for (let i = 0; i < 40; i += 1) inbox.receive({ code: `code-${String(i).padStart(4, '0')}` });
  assert.equal(inbox.receive({ code: 'code-0039' }), 'duplicate');
  assert.equal(inbox.receive({ code: 'code-0000' }), 'stored');
});
