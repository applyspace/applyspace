import { mkdtemp, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { detectBlock } from '../src/blocks.js';
import { collectFieldStats, observeParams, recordArrays } from '../src/probe/analyze.js';
import { parseCli } from '../src/probe/args.js';
import { MATRIX, MAX_DELAY_MS, MAX_PAGES_PER_RUN, MIN_DELAY_MS } from '../src/probe/config.js';
import { clampPages, criteriaFromArgs, matrixCriteria, planListings, planMatrix } from '../src/probe/plan.js';
import { redactHtml, redactJson, redactUrl } from '../src/probe/redact.js';
import { nextDelayMs, runProbe, type ProbeDeps } from '../src/probe/run.js';
import type { ProbeSession } from '../src/probe/types.js';
import { NOW, fixture } from './helpers.js';

describe('limits', () => {
  it('keeps the documented pacing and page cap', () => {
    expect(MIN_DELAY_MS).toBe(6000);
    expect(MAX_DELAY_MS).toBe(12000);
    expect(MAX_PAGES_PER_RUN).toBe(5);
    expect(nextDelayMs(() => 0)).toBe(6000);
    expect(nextDelayMs(() => 1)).toBe(12000);
    expect(nextDelayMs(() => 0.5)).toBe(9000);
  });

  it('clamps pages and shares the budget with detail pages', () => {
    expect(clampPages(50)).toEqual({ pages: 5, details: 0 });
    expect(clampPages(0)).toEqual({ pages: 1, details: 0 });
    expect(clampPages(2, 10)).toEqual({ pages: 2, details: 3 });
    expect(clampPages(5, 2)).toEqual({ pages: 5, details: 0 });
  });
});

describe('cli args', () => {
  it('parses a normal run with defaults', () => {
    const opts = parseCli(['hellowork', '--query', 'product designer', '--location', 'Paris', '--pages', '2']);
    expect(opts).toMatchObject({ platform: 'hellowork', query: 'product designer', location: 'Paris', pages: 2, headless: false, prompt: true, matrix: false });
    expect((opts as { profileDir: string }).profileDir).toMatch(/\.apply[\\/]probe-profile$/);
  });

  it('is headed by default and rejects bad input', () => {
    expect(parseCli(['nope', '--query', 'x'])).toHaveProperty('error');
    expect(parseCli(['indeed'])).toHaveProperty('error');
    expect(parseCli(['indeed', '--query', 'x', '--pages', '0'])).toHaveProperty('error');
    expect(parseCli(['indeed', '--query', 'x', '--sort', 'random'])).toHaveProperty('error');
    expect(parseCli(['indeed', '--query', 'x', '--bogus'])).toHaveProperty('error');
    expect(parseCli(['--help'])).toEqual({ help: true });
    expect(parseCli(['linkedin', '--matrix'])).toMatchObject({ matrix: true });
  });
});

describe('plan', () => {
  it('plans one load per listing page', () => {
    const plan = planListings('indeed', criteriaFromArgs({ query: 'data analyst', location: 'Niort', sort: 'date' }), 3);
    expect(plan.map((p) => p.built.params.start)).toEqual([undefined, '10', '20']);
    expect(plan[0]?.criteriaLabel).toBe('data analyst / Niort / date');
  });

  it('covers the 3 x 4 x 2 matrix', () => {
    expect(MATRIX.titles).toHaveLength(3);
    expect(MATRIX.places).toHaveLength(4);
    expect(matrixCriteria()).toHaveLength(24);
    const linkedin = planMatrix('linkedin', 1);
    expect(linkedin.runs).toHaveLength(24);
    expect(linkedin.runs[0]?.[0]?.built.url).toContain('keywords=product+designer');
  });

  it('drops combinations whose url does not change with the sort order', () => {
    const hw = planMatrix('hellowork', 1);
    expect(hw.runs).toHaveLength(12);
    expect(hw.skipped).toHaveLength(12);
  });
});

describe('block detection', () => {
  it('detects status codes, redirects and challenge pages', () => {
    expect(detectBlock({ platform: 'indeed', status: 403 }).blocked).toBe(true);
    expect(detectBlock({ platform: 'linkedin', status: 999 }).blocked).toBe(true);
    expect(detectBlock({ platform: 'linkedin', status: 200, url: 'https://www.linkedin.com/authwall?trk=x' }).blocked).toBe(true);
    expect(detectBlock({ platform: 'wttj', status: 200, html: '<title>Just a moment...</title>' }).blocked).toBe(true);
    expect(detectBlock({ platform: 'indeed', html: '<h1>Additional Verification Required</h1>' }).blocked).toBe(true);
  });

  it('does not flag normal pages, even large ones that mention a captcha script', () => {
    expect(detectBlock({ platform: 'hellowork', status: 200, html: fixture('hellowork-listing.html') }).blocked).toBe(false);
    const big = `<html><title>Offres</title><script>var captcha = false;</script>${'x'.repeat(200_000)}</html>`;
    expect(detectBlock({ platform: 'hellowork', status: 200, html: big }).blocked).toBe(false);
  });
});

describe('redaction', () => {
  it('redacts sensitive url parameters', () => {
    const url = redactUrl('https://x.algolia.net/1/indexes/*/queries?x-algolia-api-key=SECRETVALUE&x-algolia-application-id=APP&q=designer&page=2');
    expect(url).not.toContain('SECRETVALUE');
    expect(url).toContain('q=designer');
    expect(url).toContain('page=2');
  });

  it('redacts sensitive json keys but keeps job data', () => {
    const out = redactJson({ title: 'Designer', csrfToken: 'abc', nested: [{ sessionId: 'zzz', city: 'Paris' }], authors: ['a'] }) as Record<string, unknown>;
    expect(JSON.stringify(out)).not.toContain('abc');
    expect(JSON.stringify(out)).not.toContain('zzz');
    expect(out.title).toBe('Designer');
    expect(JSON.stringify(out)).toContain('Paris');
  });

  it('redacts csrf and bearer values in html', () => {
    const html = '<meta name="csrf-token" content="TOPSECRETTOKEN"><script>var a={"csrfToken":"ANOTHERSECRET123"}; fetch(u,{headers:{Authorization:"Bearer abcdefghijklmnop123"}})</script>';
    const safe = redactHtml(html);
    expect(safe).not.toContain('TOPSECRETTOKEN');
    expect(safe).not.toContain('ANOTHERSECRET123');
    expect(safe).not.toContain('abcdefghijklmnop123');
  });
});

describe('analysis', () => {
  it('computes fill rates against the enclosing array', () => {
    const stats = collectFieldStats([{ a: 1, b: null, c: { d: 'x' } }, { a: 2, b: 'y', c: { d: '' } }]);
    const by = Object.fromEntries(stats.map((s) => [s.path, s]));
    expect(by.a).toMatchObject({ filled: 2, total: 2, example: '1' });
    expect(by.b).toMatchObject({ filled: 1, total: 2, types: ['null', 'string'], example: 'y' });
    expect(by['c.d']).toMatchObject({ filled: 1, total: 2 });
  });

  it('finds job-like arrays and observed params', () => {
    expect(recordArrays({ results: [{ hits: [{ title: 'a' }, { title: 'b' }] }] })[0]).toHaveLength(2);
    expect(observeParams(['https://a.test/?q=1&q=2&z=3', 'https://a.test/?q=1'])).toEqual([
      { name: 'q', values: ['1', '2'] },
      { name: 'z', values: ['3'] },
    ]);
  });
});

function fakeDeps(pages: Array<{ status: number; html: string; json?: Array<{ url: string; body: string }> }>) {
  const sleeps: number[] = [];
  const visited: string[] = [];
  let closed = false;
  const handlers: Array<(r: { url: string; status: number; body: string }) => void> = [];
  let i = 0;
  const session: ProbeSession = {
    async goto(url) {
      visited.push(url);
      const page = pages[Math.min(i, pages.length - 1)];
      i += 1;
      if (!page) throw new Error('no page');
      for (const j of page.json ?? []) handlers.forEach((h) => h({ url: j.url, status: 200, body: j.body }));
      return { status: page.status, finalUrl: url, html: page.html };
    },
    onJson: (h) => void handlers.push(h),
    close: async () => void (closed = true),
  };
  const deps: ProbeDeps = {
    driver: { open: async () => session },
    sleep: async (ms) => void sleeps.push(ms),
    random: () => 0.5,
    now: () => NOW,
    log: () => undefined,
  };
  return { deps, sleeps, visited, isClosed: () => closed };
}

describe('runProbe', () => {
  it('loads pages with pacing, saves files and writes the report', async () => {
    const outputDir = await mkdtemp(join(tmpdir(), 'probe-test-'));
    const fake = fakeDeps([
      { status: 200, html: fixture('hellowork-listing.html'), json: [{ url: 'https://api.test/x?api-key=SECRET&q=1', body: JSON.stringify({ jobs: [{ title: 'a', city: 'Paris' }, { title: 'b', city: null }], csrfToken: 'SHOULDNOTLEAK' }) }] },
      { status: 200, html: fixture('hellowork-listing.html') },
    ]);
    const plan = planListings('hellowork', criteriaFromArgs({ query: 'product designer', location: 'Paris' }), 2);
    const { outDir, reportPath, run } = await runProbe(
      { platform: 'hellowork', runs: [plan], profileDir: '/tmp/unused', outputDir, headless: false, startPage: 'https://start.test', host: 'fr.indeed.com', details: 0 },
      fake.deps,
    );
    expect(fake.visited).toEqual(plan.map((p) => p.built.url));
    expect(fake.sleeps).toEqual([9000]);
    expect(fake.isClosed()).toBe(true);
    expect(run.stoppedReason).toBeNull();
    expect((await readdir(join(outDir, 'html'))).sort()).toEqual(['001-listing.html', '002-listing.html']);

    const saved = await readFile(join(outDir, 'responses', '001.json'), 'utf8');
    expect(saved).not.toContain('SHOULDNOTLEAK');
    const report = await readFile(reportPath, 'utf8');
    expect(report).toContain('# Fields report: hellowork');
    expect(report).toContain('| `k` | product designer | no |');
    expect(report).toContain('| `p` | 2 | yes |');
    expect(report).toContain('Cards parsed: 4');
    expect(report).toMatch(/\| 2 \| 2 \| 2 \| 2 \|/); // page 2 repeats both ids
    expect(report).toContain('`title`');
    expect(report).toContain('None seen.');
    expect(report).not.toContain('api-key=SECRET');
    expect(report).toContain('api-key=%5BREDACTED%5D');
  });

  it('stops at the first block and still writes the report', async () => {
    const outputDir = await mkdtemp(join(tmpdir(), 'probe-test-'));
    const fake = fakeDeps([
      { status: 200, html: fixture('linkedin-guest-cards.html') },
      { status: 200, html: '<html><title>Let\'s do a quick security check</title></html>' },
      { status: 200, html: fixture('linkedin-guest-cards.html') },
    ]);
    const plan = planListings('linkedin', criteriaFromArgs({ query: 'x' }), 3);
    const { reportPath, run } = await runProbe(
      { platform: 'linkedin', runs: [plan], profileDir: '/tmp/unused', outputDir, headless: true, startPage: 'https://start.test', host: 'fr.indeed.com', details: 0 },
      fake.deps,
    );
    expect(fake.visited).toHaveLength(2);
    expect(run.stoppedReason).toMatch(/block at load 2/);
    const report = await readFile(reportPath, 'utf8');
    expect(report).toContain('Load #2');
    expect(report).toContain('Stopped early: block at load 2');
  });

  it('never exceeds 5 page loads for one search run, details included', async () => {
    const outputDir = await mkdtemp(join(tmpdir(), 'probe-test-'));
    const fake = fakeDeps([{ status: 200, html: fixture('hellowork-listing.html') }]);
    const plan = planListings('hellowork', criteriaFromArgs({ query: 'x' }), 5);
    await runProbe(
      { platform: 'hellowork', runs: [plan], profileDir: '/tmp/unused', outputDir, headless: true, startPage: 'https://start.test', host: 'fr.indeed.com', details: 3, detailUrls: () => ['https://d.test/1', 'https://d.test/2', 'https://d.test/3'] },
      fake.deps,
    );
    expect(fake.visited).toHaveLength(5);
  });

  it('opens detail pages from the first listing within the budget', async () => {
    const outputDir = await mkdtemp(join(tmpdir(), 'probe-test-'));
    const fake = fakeDeps([
      { status: 200, html: fixture('hellowork-listing.html') },
      { status: 200, html: fixture('hellowork-detail.html') },
    ]);
    const plan = planListings('hellowork', criteriaFromArgs({ query: 'x' }), 1);
    const { reportPath } = await runProbe(
      { platform: 'hellowork', runs: [plan], profileDir: '/tmp/unused', outputDir, headless: true, startPage: 'https://start.test', host: 'fr.indeed.com', details: 1, detailUrls: () => ['https://www.hellowork.com/fr-fr/emplois/78174679.html'] },
      fake.deps,
    );
    expect(fake.visited[1]).toBe('https://www.hellowork.com/fr-fr/emplois/78174679.html');
    const report = await readFile(reportPath, 'utf8');
    expect(report).toContain('JobPosting objects found: 1');
    expect(report).toContain('`baseSalary.value.minValue`');
  });
});
