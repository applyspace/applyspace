import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isSiteAsset, siteRoute } from './site-routing.ts';

test('signed-out visitors get the website on / and the marketing pages', () => {
  for (const p of ['/', '/product', '/pricing', '/resources', '/resources/how-to-track', '/en/pricing', '/fr']) {
    assert.equal(siteRoute(p, false), 'site', p);
  }
});

test('signed-in users never see the website: / is the app, marketing pages go home', () => {
  assert.equal(siteRoute('/', true), 'app');
  for (const p of ['/product', '/pricing', '/resources/how-to-track', '/en']) {
    assert.equal(siteRoute(p, true), 'redirect-home', p);
  }
});

test('assets and SEO files are served by the website for everyone', () => {
  for (const p of ['/sitemap.xml', '/robots.txt', '/_site/_next/static/a.js', '/og', '/api/revalidate']) {
    assert.equal(isSiteAsset(p), true, p);
    assert.equal(siteRoute(p, true), 'site', p);
    assert.equal(siteRoute(p, false), 'site', p);
  }
});

test('app paths stay in the app', () => {
  for (const p of ['/login', '/auth/callback', '/offers', '/applications', '/api/geocode', '/productivity', '/pricings']) {
    assert.equal(siteRoute(p, false), 'app', p);
    assert.equal(siteRoute(p, true), 'app', p);
  }
});
