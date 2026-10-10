import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  DEFAULT_ANCHOR,
  DEMO_TABLES,
  buildDemoDataset,
  demoUuid,
  generateSeedSql,
  isDemoEmail,
  summarize,
} from '../src/demo/index';

const USER = '11111111-1111-4111-8111-111111111111';
const build = (anchor = DEFAULT_ANCHOR, userId = USER) => buildDemoDataset({ anchor, userId });

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

test('same inputs, same dataset (deterministic)', () => {
  const a = JSON.stringify(build(), (_k, v) => (v instanceof Uint8Array ? Array.from(v) : v));
  const b = JSON.stringify(build(), (_k, v) => (v instanceof Uint8Array ? Array.from(v) : v));
  assert.equal(a, b);
});

test('ids are valid uuids, unique per table, and independent of the user', () => {
  const one = build(DEFAULT_ANCHOR, USER);
  const two = build(DEFAULT_ANCHOR, '22222222-2222-4222-8222-222222222222');
  for (const table of DEMO_TABLES) {
    const ids = one.tables[table].map((r) => r.id).filter(Boolean) as string[];
    assert.equal(new Set(ids).size, ids.length, `${table} ids are unique`);
    for (const id of ids) assert.match(id, UUID_RE, `${table} id format`);
    assert.deepEqual(ids, two.tables[table].map((r) => r.id).filter(Boolean), `${table} ids do not depend on the user`);
  }
  assert.equal(demoUuid('offer', '1'), demoUuid('offer', '1'));
  assert.notEqual(demoUuid('offer', '1'), demoUuid('offer', '2'));
});

test('volumes match the brief', () => {
  const s = summarize(build());
  assert.equal(s.offers, 40);
  assert.equal(s.applications, 20);
  assert.ok(s.companies >= 30);
  assert.ok(s.interviews >= 10);
  assert.ok(s.searches >= 3);
  assert.ok(s.documents >= 4);
  for (const t of ['experiences', 'education', 'skills', 'languages', 'certifications', 'profile_links']) {
    assert.ok(s[t] > 0, `${t} is not empty`);
  }
});

test('applications cover every pipeline status, offers span several platforms and statuses', () => {
  const d = build();
  const statuses = new Set(d.tables.applications.map((r) => r.status));
  for (const s of ['waiting', 'interviewing', 'accepted', 'rejected', 'ghosted', 'withdrawn']) assert.ok(statuses.has(s), s);
  const platforms = new Set(d.tables.offers.map((r) => r.platform_slug));
  assert.ok(platforms.size >= 6, `platforms: ${[...platforms].join(',')}`);
  const offerStatuses = new Set(d.tables.offers.map((r) => r.user_status));
  for (const s of ['new', 'viewed', 'passed', 'applied']) assert.ok(offerStatuses.has(s), s);
  assert.ok(d.tables.applications.every((r) => typeof r.location === 'string' && r.location), 'every application has a location');
  assert.ok(d.tables.applications.some((r) => r.offer_id === null), 'some applications were logged by hand');
});

test('relations stay inside the dataset and inside one user', () => {
  const d = build();
  const ids = (t: (typeof DEMO_TABLES)[number]) => new Set(d.tables[t].map((r) => r.id));
  const profiles = ids('profiles'), companies = ids('companies'), offers = ids('offers');
  const applications = ids('applications'), documents = ids('documents');
  for (const t of DEMO_TABLES) for (const r of d.tables[t]) assert.equal(r.user_id, USER, `${t} user_id`);
  for (const r of d.tables.experiences) { assert.ok(profiles.has(r.profile_id as string)); assert.ok(companies.has(r.company_id as string)); }
  for (const r of d.tables.offers) assert.ok(companies.has(r.company_id as string));
  for (const r of d.tables.offer_sources) assert.ok(offers.has(r.offer_id as string));
  for (const r of d.tables.applications) {
    assert.ok(profiles.has(r.profile_id as string)); assert.ok(companies.has(r.company_id as string));
    if (r.offer_id) assert.ok(offers.has(r.offer_id as string));
  }
  const withOffer = d.tables.applications.map((r) => r.offer_id).filter(Boolean);
  assert.equal(new Set(withOffer).size, withOffer.length, 'at most one application per offer');
  for (const r of d.tables.application_documents) { assert.ok(applications.has(r.application_id as string)); assert.ok(documents.has(r.document_id as string)); }
  for (const r of d.tables.interviews) assert.ok(applications.has(r.application_id as string));
  for (const r of d.tables.searches) assert.ok(profiles.has(r.profile_id as string));
  // An applied offer has an application and the other way round.
  const appliedOffers = new Set(d.tables.offers.filter((r) => r.user_status === 'applied').map((r) => r.id));
  assert.deepEqual(new Set(withOffer), appliedOffers);
});

test('values respect the database check constraints', () => {
  const d = build();
  const oneOf = (value: unknown, list: readonly string[], what: string) => assert.ok(list.includes(value as string), `${what}: ${String(value)}`);
  for (const r of d.tables.companies) oneOf(r.size, ['startup', 'scale-up', 'midsize', 'large'], 'company size');
  for (const r of d.tables.offers) {
    oneOf(r.remote_mode, ['onsite', 'hybrid', 'remote'], 'remote mode');
    oneOf(r.contract, ['CDI', 'CDD', 'Stage', 'Freelance', 'Apprentissage', 'Alternance', 'Bénévolat'], 'contract');
    oneOf(r.experience_level, ['entry', 'mid', 'senior', 'lead'], 'level');
    oneOf(r.platform_slug, ['linkedin', 'indeed', 'glassdoor', 'wttj', 'hellowork', 'jobsthatmakesense', 'collectivework', 'francetravail'], 'platform');
    assert.ok(typeof r.description === 'string' && r.description);
  }
  for (const r of d.tables.applications) oneOf(r.status, ['waiting', 'interviewing', 'accepted', 'rejected', 'ghosted', 'withdrawn'], 'status');
  for (const r of d.tables.interviews) {
    oneOf(r.stage, ['HR', 'Manager', 'Design Case', 'Team-Fit', 'Technical', 'Final', 'Other'], 'stage');
    oneOf(r.outcome, ['pending', 'passed', 'failed', 'ghosted'], 'outcome');
  }
  for (const r of d.tables.skills) oneOf(r.level, ['beginner', 'intermediate', 'advanced', 'expert'], 'skill level');
  for (const r of d.tables.languages) oneOf(r.level, ['basic', 'conversational', 'professional', 'native'], 'language level');
  for (const r of d.tables.documents) {
    oneOf(r.kind, ['cv', 'fit_message', 'other'], 'document kind');
    assert.ok(r.kind === 'fit_message' || r.storage_path, 'files need a storage path');
  }
  assert.equal(d.tables.documents.filter((r) => r.kind === 'cv' && r.is_primary).length, 1, 'one primary CV');
  assert.equal(d.tables.documents.filter((r) => r.kind === 'fit_message' && r.is_primary).length, 1, 'one primary fit message');
  assert.equal(d.tables.profiles.filter((r) => r.is_default).length, 1, 'one default profile');
  const urls = [...d.tables.profile_links, ...d.tables.offers, ...d.tables.offer_sources].map((r) => (r.url ?? '') as string);
  for (const url of urls) assert.match(url, /^https:\/\//);
  const searchesWithRange = d.tables.searches.filter((r) => r.salary_min !== null && r.salary_max !== null);
  for (const r of searchesWithRange) assert.ok((r.salary_max as number) >= (r.salary_min as number));
});

test('nothing real: reserved hosts only, no domain, no email other than the demo domain', () => {
  const d = build();
  const text = JSON.stringify(d.tables) + JSON.stringify(d.account);
  const hosts = [...text.matchAll(/https?:\/\/([a-z0-9.-]+)/gi)].map((m) => m[1].toLowerCase());
  assert.ok(hosts.length > 0);
  for (const host of hosts) assert.ok(host.endsWith('.example'), `non-reserved host ${host}`);
  for (const email of text.match(/[\w.+-]+@[\w.-]+/g) ?? []) assert.ok(isDemoEmail(email), `unexpected email ${email}`);
  for (const r of d.tables.companies) assert.equal(r.domain, null);
  assert.equal(build().account.plan, 'max');
});

test('dates follow the anchor, with upcoming interviews', () => {
  const d = build('2026-10-12');
  const anchor = Date.UTC(2026, 9, 12);
  const upcoming = d.tables.interviews.filter((r) => Date.parse(r.scheduled_at as string) > anchor);
  assert.ok(upcoming.length >= 4, 'upcoming interviews');
  for (const r of upcoming) assert.equal(r.outcome, 'pending');
  const later = build('2027-01-05');
  assert.notEqual(later.tables.offers[0].posted_at, d.tables.offers[0].posted_at);
  assert.throws(() => build('2026-02-31'));
  assert.throws(() => build('tomorrow'));
});

test('placeholder files are valid PDFs and sized in the document rows', () => {
  const d = build();
  assert.ok(d.files.length >= 3);
  for (const f of d.files) {
    assert.ok(f.path.startsWith(`${USER}/`));
    assert.equal(new TextDecoder().decode(f.bytes.slice(0, 8)), '%PDF-1.4');
    const row = d.tables.documents.find((r) => r.storage_path === f.path)!;
    assert.equal(row.size_bytes, f.bytes.length);
    assert.equal(row.mime_type, 'application/pdf');
  }
});

test('isDemoEmail only accepts the reserved domain exactly', () => {
  assert.equal(isDemoEmail('demo@example.com'), true);
  assert.equal(isDemoEmail('Demo@Example.COM'), true);
  assert.equal(isDemoEmail('demo@example.com.evil.io'), false);
  assert.equal(isDemoEmail('demo@notexample.com'), false);
  assert.equal(isDemoEmail('example.com'), false);
  assert.equal(isDemoEmail(null), false);
});

test('generated SQL: guarded, scoped to the demo user, and stable', () => {
  const sql = generateSeedSql();
  assert.equal(sql, generateSeedSql(), 'same options, same SQL');
  assert.notEqual(sql, generateSeedSql({ anchor: '2027-01-05' }), 'the anchor moves the dates');
  assert.match(sql, /not like '%@example\.com'/);
  assert.match(sql, /No auth user|no auth user/i);
  assert.ok(!sql.includes('drop ') && !/truncate/i.test(sql), 'no drop or truncate');
  const deletes = sql.match(/delete from public\.\w+ where [^;]+;/g) ?? [];
  assert.ok(deletes.length >= 19);
  for (const stmt of deletes) assert.ok(stmt.endsWith('where user_id = v_user;'), stmt);
  assert.ok(!/00000000-0000-4000-8000-0000000000de/.test(sql), 'the placeholder user id never leaks');
  assert.throws(() => generateSeedSql({ email: 'someone@gmail.com' }));
});
