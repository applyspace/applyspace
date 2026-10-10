import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createAuthLogger, formatAuthLog, sanitizeReport } from './authLog.js';

const CODE = '3f2a9c1e-7b4d-4e8a-9d52-0c6f1a8b7e34';
const AT = new Date('2026-10-10T04:00:00.000Z');

test('formats numbers, booleans, null and known words', () => {
  assert.equal(
    formatAuthLog('deep-link', { source: 'macos-open-url', parsed: 'code', codeLength: 36, hasWindow: true, msSinceLoad: null }, AT),
    '2026-10-10T04:00:00.000Z [auth] deep-link source=macos-open-url parsed=code codeLength=36 hasWindow=true msSinceLoad=null',
  );
});

test('a code or token that slips into a field is replaced by its length', () => {
  // Cast: the types forbid this, the runtime guard is the second line of defence.
  const line = formatAuthLog('deep-link', { oops: CODE as never, jwt: 'eyJhbGciOiJIUzI1NiJ9.payload.sig' as never }, AT);
  assert.ok(!line.includes(CODE));
  assert.ok(!line.includes('eyJ'));
  assert.match(line, /oops=<redacted:36>/);
});

test('the logger stamps each line and hands it to the writer', () => {
  const lines: string[] = [];
  const log = createAuthLogger((l) => lines.push(l), () => AT);
  log('reset', { hadPending: false });
  assert.deepEqual(lines, ['2026-10-10T04:00:00.000Z [auth] reset hadPending=false']);
});

test('renderer reports keep only a known stage, a known error name and a sane status', () => {
  assert.deepEqual(sanitizeReport({ stage: 'exchange-error', errorName: 'AuthPKCECodeVerifierMissingError', status: 400 }), {
    stage: 'exchange-error',
    errorName: 'AuthPKCECodeVerifierMissingError',
    status: 400,
  });
  assert.deepEqual(sanitizeReport({ stage: 'exchange-ok' }), { stage: 'exchange-ok', errorName: 'none', status: null });
  assert.deepEqual(sanitizeReport({ stage: CODE, errorName: CODE, status: 12345 }), { stage: 'other', errorName: 'other', status: null });
  assert.deepEqual(sanitizeReport(null), { stage: 'other', errorName: 'none', status: null });
  assert.deepEqual(sanitizeReport('x'), { stage: 'other', errorName: 'none', status: null });
});
