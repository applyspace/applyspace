import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { after, before, test } from 'node:test';
import { createBrowserClient } from '@supabase/ssr';

/**
 * Library-level check of the desktop sign-in with the real @supabase/ssr browser client:
 * sign in with one provider, sign out, then sign in with another. The second code exchange must
 * reach `/token` with the verifier of the second attempt (the PKCE verifier and the sign-out
 * scope were suspected of breaking this; they do not). The Supabase API and the browser are faked.
 */

const jar = new Map<string, string>();
const fakeDocument = {
  get cookie() {
    return [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
  },
  set cookie(raw: string) {
    const [pair, ...attrs] = raw.split(';');
    const i = pair.indexOf('=');
    const name = pair.slice(0, i);
    const maxAge = attrs.map((a) => a.trim()).find((a) => /^max-age=/i.test(a));
    if (maxAge && Number(maxAge.split('=')[1]) <= 0) jar.delete(name);
    else jar.set(name, pair.slice(i + 1));
  },
};

const requests: string[] = [];
let issuedChallenge = '';
const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
/** `globalThis` seen as the browser globals this test fakes. */
const g = globalThis as unknown as { window?: unknown; document?: unknown; BroadcastChannel?: unknown };
const originals = { window: g.window, document: g.document, fetch: globalThis.fetch, broadcast: g.BroadcastChannel };

before(() => {
  // The client syncs tabs through a BroadcastChannel, which keeps Node alive; irrelevant here.
  g.BroadcastChannel = undefined;
  g.document = fakeDocument;
  g.window = {
    document: fakeDocument,
    location: { href: 'http://127.0.0.1:3999/login', origin: 'http://127.0.0.1:3999' },
    addEventListener() {},
    removeEventListener() {},
  };
  globalThis.fetch = (async (url: string, init: RequestInit = {}) => {
    const u = new URL(url);
    requests.push(`${init.method ?? 'GET'} ${u.pathname}${u.search.split('&')[0]}`);
    const json = (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
    if (u.pathname.endsWith('/token')) {
      const { code_verifier } = JSON.parse(String(init.body));
      const challenge = crypto.createHash('sha256').update(code_verifier ?? '').digest('base64url');
      if (challenge !== issuedChallenge) return json({ code: 400, error_code: 'flow_state_not_found', msg: 'verifier mismatch' }, 400);
      const now = Math.floor(Date.now() / 1000);
      const jwt = `${b64({ alg: 'HS256' })}.${b64({ sub: 'u1', exp: now + 3600, session_id: 's1', aud: 'authenticated', role: 'authenticated' })}.sig`;
      return json({
        access_token: jwt,
        refresh_token: 'r',
        expires_in: 3600,
        expires_at: now + 3600,
        token_type: 'bearer',
        user: { id: 'u1', aud: 'authenticated', email: 'a@b.c', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01' },
      });
    }
    if (u.pathname.endsWith('/logout')) return new Response(null, { status: 204 });
    return json({});
  }) as typeof fetch;
});

after(() => {
  g.BroadcastChannel = originals.broadcast;
  g.window = originals.window;
  g.document = originals.document;
  globalThis.fetch = originals.fetch;
});

test('sign in, sign out, sign in again: the second code exchange reaches /token and succeeds', async () => {
  const supabase = createBrowserClient('https://example.supabase.co', 'sb_publishable_test', { isSingleton: false });
  const start = async (provider: 'linkedin_oidc' | 'google') => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: 'https://applyspace.app/auth/desktop', skipBrowserRedirect: true },
    });
    assert.equal(error, null);
    issuedChallenge = decodeURIComponent(new URL(data.url!).searchParams.get('code_challenge')!);
  };

  try {
    await start('linkedin_oidc');
    const first = await supabase.auth.exchangeCodeForSession('11111111-1111-1111-1111-111111111111');
    assert.equal(first.error, null);

    // Desktop sign-out: this device only.
    assert.equal((await supabase.auth.signOut({ scope: 'local' })).error, null);
    assert.deepEqual([...jar.keys()], [], 'sign-out leaves no auth cookie behind');
    assert.ok(!requests.some((r) => r.includes('/logout')) || requests.some((r) => r.includes('scope=local')));

    const before = requests.length;
    await start('google');
    const second = await supabase.auth.exchangeCodeForSession('22222222-2222-2222-2222-222222222222');
    assert.equal(second.error, null, second.error?.message);
    assert.deepEqual(requests.slice(before), ['POST /auth/v1/token?grant_type=pkce']);
  } finally {
    await supabase.auth.stopAutoRefresh();
  }
});

test('the global sign-out (old behaviour) does not break the second sign-in either', async () => {
  jar.clear();
  const supabase = createBrowserClient('https://example.supabase.co', 'sb_publishable_test', { isSingleton: false });
  try {
    const { data } = await supabase.auth.signInWithOAuth({ provider: 'linkedin_oidc', options: { skipBrowserRedirect: true } });
    issuedChallenge = decodeURIComponent(new URL(data.url!).searchParams.get('code_challenge')!);
    await supabase.auth.exchangeCodeForSession('33333333-3333-3333-3333-333333333333');
    await supabase.auth.signOut(); // scope: 'global'
    const again = await supabase.auth.signInWithOAuth({ provider: 'google', options: { skipBrowserRedirect: true } });
    issuedChallenge = decodeURIComponent(new URL(again.data.url!).searchParams.get('code_challenge')!);
    const result = await supabase.auth.exchangeCodeForSession('44444444-4444-4444-4444-444444444444');
    assert.equal(result.error, null, result.error?.message);
  } finally {
    await supabase.auth.stopAutoRefresh();
  }
});
