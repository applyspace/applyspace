import assert from 'node:assert/strict';
import { test } from 'node:test';

import { findDeepLink, inspectAuthCallback, parseAuthCallback } from './deepLink.js';

const CODE = '3f2a9c1e-7b4d-4e8a-9d52-0c6f1a8b7e34';

test('accepts the callback with a well-formed code', () => {
  assert.deepEqual(parseAuthCallback(`applyspace://auth/callback?code=${CODE}`), { code: CODE });
});

test('a callback without a usable code becomes a bare failure flag', () => {
  assert.deepEqual(parseAuthCallback('applyspace://auth/callback'), { error: true });
  assert.deepEqual(parseAuthCallback('applyspace://auth/callback?code='), { error: true });
  assert.deepEqual(parseAuthCallback('applyspace://auth/callback?code=short'), { error: true });
  assert.deepEqual(parseAuthCallback(`applyspace://auth/callback?code=${'a'.repeat(513)}`), { error: true });
  assert.deepEqual(parseAuthCallback('applyspace://auth/callback?code=<script>alert(1)</script>'), { error: true });
});

test('ignores anything that is not our callback', () => {
  assert.equal(parseAuthCallback('https://applyspace.app/auth/callback?code=' + CODE), null);
  assert.equal(parseAuthCallback(`applyspace://other/callback?code=${CODE}`), null);
  assert.equal(parseAuthCallback(`applyspace://auth/elsewhere?code=${CODE}`), null);
  assert.equal(parseAuthCallback('not a url'), null);
});

test('inspect tells why a callback is unusable and exposes only the code length', () => {
  assert.deepEqual(inspectAuthCallback('applyspace://auth/callback'), { kind: 'no-code' });
  assert.deepEqual(inspectAuthCallback('applyspace://auth/callback?code=short'), { kind: 'bad-code', codeLength: 5 });
  assert.deepEqual(inspectAuthCallback(`applyspace://auth/callback?code=${CODE}`), { kind: 'code', code: CODE });
  assert.deepEqual(inspectAuthCallback('https://example.com'), { kind: 'not-ours' });
});

test('finds the deep link among process arguments', () => {
  assert.equal(findDeepLink(['/Applications/ApplySpace', '--flag', `applyspace://auth/callback?code=${CODE}`]), `applyspace://auth/callback?code=${CODE}`);
  assert.equal(findDeepLink(['/Applications/ApplySpace']), undefined);
});
