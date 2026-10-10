import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isDemoHost, isDemoWriteBlocked } from './demo-host.ts';

test('only demo.* hosts are the public demo (previews and the main domain are not)', () => {
  delete process.env.APPLY_DEMO;
  assert.equal(isDemoHost('demo.applyspace.app'), true);
  assert.equal(isDemoHost('DEMO.applyspace.app'), true);
  assert.equal(isDemoHost('applyspace.app'), false);
  assert.equal(isDemoHost('applyspace-git-feature-demo-account.vercel.app'), false);
  assert.equal(isDemoHost('xdemo.applyspace.app'), false);
  assert.equal(isDemoHost(null), false);
});

test('the public demo refuses writing API calls and allows reads', () => {
  for (const method of ['POST', 'PATCH', 'PUT', 'DELETE', 'post']) {
    assert.equal(isDemoWriteBlocked(method, '/api/settings'), true, method);
    assert.equal(isDemoWriteBlocked(method, '/api/linkedin/profile'), true, method);
  }
  for (const method of ['GET', 'HEAD', 'OPTIONS']) assert.equal(isDemoWriteBlocked(method, '/api/suggest/places'), false, method);
  // Page requests (including server actions, which are POSTs to a page) are not API routes.
  assert.equal(isDemoWriteBlocked('POST', '/onboarding'), false);
  assert.equal(isDemoWriteBlocked('POST', '/apipe'), false);
});
