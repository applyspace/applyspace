import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { detectBlock } from '../blocks.js';
import type { Platform } from '../types.js';
import { MAX_DELAY_MS, MAX_PAGES_PER_RUN, MIN_DELAY_MS } from './config.js';
import type { PlannedLoad } from './plan.js';
import { redactHtml, redactJson, redactUrl } from './redact.js';
import { renderReport } from './report.js';
import type { JsonResponseRecord, PageRecord, ProbeDriver, ProbeSession, RunRecord } from './types.js';

export interface ProbeDeps {
  driver: ProbeDriver;
  sleep(ms: number): Promise<void>;
  random(): number;
  now(): Date;
  log(message: string): void;
  /** Called once the browser is open, so the user can log in or solve a captcha by hand. */
  waitForUser?(message: string): Promise<void>;
}

export interface ProbeOptions {
  platform: Platform;
  /** One entry per search run; each is a list of loads (listing pages, then details). */
  runs: PlannedLoad[][];
  skippedCombinations?: string[];
  profileDir: string;
  outputDir: string;
  headless: boolean;
  startPage: string;
  host: string;
  /** Number of detail pages to open per run, taken from the first listing. */
  details: number;
  /** Test hook only; the CLI never sets it, so real runs always use the 6 to 12 s window. */
  pacing?: { minMs: number; maxMs: number };
  /** Extracts detail URLs from a listing page. */
  detailUrls?: (html: string) => string[];
}

export function nextDelayMs(random: () => number, min = MIN_DELAY_MS, max = MAX_DELAY_MS): number {
  return Math.round(min + random() * (max - min));
}

function stamp(d: Date): string {
  return d.toISOString().replace(/[:.]/g, '-');
}

/**
 * Orchestrates a probe run: loads pages one by one with a random 6 to 12 s pause, saves raw
 * HTML and observed JSON, stops at the first captcha or block, then writes fields-report.md.
 * Total page loads are capped at MAX_PAGES_PER_RUN per search run.
 */
export async function runProbe(options: ProbeOptions, deps: ProbeDeps): Promise<{ outDir: string; reportPath: string; run: RunRecord }> {
  const started = deps.now();
  const outDir = join(options.outputDir, `${options.platform}-${stamp(started)}`);
  await mkdir(join(outDir, 'html'), { recursive: true });
  await mkdir(join(outDir, 'responses'), { recursive: true });

  const session: ProbeSession = await deps.driver.open({ profileDir: options.profileDir, headless: options.headless });
  const pacing = options.pacing ?? { minMs: MIN_DELAY_MS, maxMs: MAX_DELAY_MS };
  const records: PageRecord[] = [];
  let stoppedReason: string | null = null;
  let current: JsonResponseRecord[] = [];
  let pending: Promise<void>[] = [];
  let responseCounter = 0;

  session.onJson(({ url, status, body }) => {
    if (body.length > 2_000_000) return;
    const task = (async () => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(body);
      } catch {
        return;
      }
      responseCounter += 1;
      const file = `responses/${String(responseCounter).padStart(3, '0')}.json`;
      const text = JSON.stringify(redactJson(parsed), null, 2);
      await writeFile(join(outDir, file), text);
      current.push({ url: redactUrl(url), status, file, bytes: text.length });
    })();
    pending.push(task);
  });

  try {
    if (deps.waitForUser) {
      await session.goto(options.startPage).catch(() => undefined);
      await deps.waitForUser(
        `Browser opened on ${options.startPage}. Log in by hand if you want to, then press Enter here to start (or Ctrl+C to stop).`,
      );
    }

    let first = true;
    outer: for (const run of options.runs) {
      let budget = MAX_PAGES_PER_RUN;
      let detailUrls: string[] = [];
      const loads = [...run];
      for (let i = 0; i < loads.length && budget > 0; i++) {
        const load = loads[i];
        if (!load) break;
        if (!first) {
          const wait = nextDelayMs(deps.random, pacing.minMs, pacing.maxMs);
          deps.log(`waiting ${(wait / 1000).toFixed(1)} s before the next page`);
          await deps.sleep(wait);
        }
        first = false;
        budget -= 1;
        current = [];
        pending = [];
        const index = records.length + 1;
        deps.log(`load ${index}: ${load.built.url}`);
        const t0 = deps.now().getTime();
        const record: PageRecord = {
          index,
          kind: load.kind,
          page: load.page,
          criteriaLabel: load.criteriaLabel,
          requestedUrl: load.built.url,
          finalUrl: load.built.url,
          status: null,
          durationMs: 0,
          htmlFile: null,
          htmlBytes: 0,
          block: { blocked: false, reason: null },
          unverifiedParams: load.built.unverifiedParams,
          robotsDisallowed: load.built.robotsDisallowed,
          jsonResponses: [],
        };
        let html = '';
        try {
          const res = await session.goto(load.built.url);
          html = res.html;
          record.status = res.status;
          record.finalUrl = redactUrl(res.finalUrl);
        } catch (err) {
          record.error = err instanceof Error ? err.message : String(err);
        }
        await Promise.all(pending);
        record.durationMs = deps.now().getTime() - t0;
        record.jsonResponses = [...current];
        if (html) {
          const file = `html/${String(index).padStart(3, '0')}-${load.kind}.html`;
          const safe = redactHtml(html);
          await writeFile(join(outDir, file), safe);
          record.htmlFile = file;
          record.htmlBytes = safe.length;
          record.block = detectBlock({ platform: options.platform, status: record.status, url: record.finalUrl, html });
        } else if (record.status === 403 || record.status === 429) {
          record.block = detectBlock({ platform: options.platform, status: record.status });
        }
        records.push(record);

        if (record.block.blocked) {
          stoppedReason = `block at load ${index}: ${record.block.reason}`;
          deps.log(`stopping: ${stoppedReason}`);
          break outer;
        }
        if (record.error) {
          stoppedReason = `error at load ${index}: ${record.error}`;
          deps.log(`stopping: ${stoppedReason}`);
          break outer;
        }
        if (load.kind === 'listing' && load.page === 1 && options.details > 0 && options.detailUrls && html) {
          detailUrls = options.detailUrls(html).slice(0, options.details);
          detailUrls.forEach((url, n) =>
            loads.push({ kind: 'detail', page: n + 1, criteriaLabel: load.criteriaLabel, built: { url, params: {}, unverified: false, unverifiedParams: [], robotsDisallowed: false, notes: [] } }),
          );
        }
      }
    }
  } finally {
    await session.close();
  }

  const run: RunRecord = {
    platform: options.platform,
    startedAt: started.toISOString(),
    finishedAt: deps.now().toISOString(),
    headless: options.headless,
    pages: records,
    skippedCombinations: options.skippedCombinations ?? [],
    stoppedReason,
  };
  await writeFile(join(outDir, 'run.json'), JSON.stringify(run, null, 2));
  const files = new Map<string, string>();
  for (const p of records) {
    if (p.htmlFile) files.set(p.htmlFile, await readFile(join(outDir, p.htmlFile), 'utf8'));
    for (const r of p.jsonResponses) files.set(r.file, await readFile(join(outDir, r.file), 'utf8'));
  }
  const report = renderReport({ run, host: options.host, readFile: (rel) => files.get(rel) ?? '', now: deps.now() });
  const reportPath = join(outDir, 'fields-report.md');
  await writeFile(reportPath, report);
  return { outDir, reportPath, run };
}
