import assert from 'node:assert/strict';
import { test } from 'node:test';
import { siteRoute } from './site-routing.ts';

test('signed-out visitors get the website on / and the marketing pages, no login redirect', () => {
  assert.deepEqual(siteRoute('/', false), { kind: 'site', rewrite: '/site/en' });
  assert.deepEqual(siteRoute('/pricing', false), { kind: 'site', rewrite: '/site/en/pricing' });
  assert.deepEqual(siteRoute('/resources/how-to-track', false), { kind: 'site', rewrite: '/site/en/resources/how-to-track' });
  assert.deepEqual(siteRoute('/product', false), { kind: 'site', rewrite: '/site/en/product' });
});

test('signed-in users never see the website: / is the app, marketing pages go home', () => {
  assert.deepEqual(siteRoute('/', true), { kind: 'app' });
  assert.deepEqual(siteRoute('/pricing', true), { kind: 'redirect', to: '/' });
  assert.deepEqual(siteRoute('/resources/x', true), { kind: 'redirect', to: '/' });
  assert.deepEqual(siteRoute('/site/en/pricing', true), { kind: 'redirect', to: '/' });
});

test('one public URL per page: internal and default-locale URLs redirect', () => {
  assert.deepEqual(siteRoute('/site/en/pricing', false), { kind: 'redirect', to: '/pricing' });
  assert.deepEqual(siteRoute('/site', false), { kind: 'redirect', to: '/' });
  assert.deepEqual(siteRoute('/en/pricing', false), { kind: 'redirect', to: '/pricing' });
  assert.deepEqual(siteRoute('/en', false), { kind: 'redirect', to: '/' });
});

test('SEO files and the CMS webhook are public for everyone', () => {
  for (const p of ['/sitemap.xml', '/robots.txt', '/og', '/api/revalidate']) {
    assert.deepEqual(siteRoute(p, false), { kind: 'public' }, p);
    assert.deepEqual(siteRoute(p, true), { kind: 'public' }, p);
  }
});

test('app paths stay in the app', () => {
  for (const p of ['/login', '/auth/callback', '/offers', '/applications', '/productivity', '/pricings', '/sitemap']) {
    assert.deepEqual(siteRoute(p, false), { kind: 'app' }, p);
    assert.deepEqual(siteRoute(p, true), { kind: 'app' }, p);
  }
});

test('desktop build: no website at all', () => {
  assert.deepEqual(siteRoute('/', false, false), { kind: 'app' });
  assert.deepEqual(siteRoute('/pricing', false, false), { kind: 'app' });
});
