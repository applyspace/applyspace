import { collectFieldStats, flattenTopKeys, jobPostings, observeParams, parseListing, recordArrays, type FieldStat } from './analyze.js';
import { redactUrl } from './redact.js';
import type { RunRecord } from './types.js';

export interface ReportInput {
  run: RunRecord;
  /** Reads a saved file (relative to the run folder). Injected so the report is testable. */
  readFile(relativePath: string): string;
  host: string;
  now?: Date;
}

function pct(filled: number, total: number): string {
  return total === 0 ? 'n/a' : `${Math.round((filled / total) * 100)}% (${filled}/${total})`;
}

function cell(v: string | null): string {
  return (v ?? '').replace(/\|/g, '\\|').replace(/`/g, "'");
}

function fieldTable(stats: FieldStat[]): string {
  if (!stats.length) return '_No data._\n';
  const rows = stats.map(
    (s) => `| \`${s.path}\` | ${s.types.join(', ')} | ${pct(s.filled, s.total)} | ${cell(s.example)} |`,
  );
  return ['| Field | Type | Fill rate | Example |', '|---|---|---|---|', ...rows].join('\n') + '\n';
}

function flattenSummary(job: object): Record<string, unknown> {
  return JSON.parse(JSON.stringify(job)) as Record<string, unknown>;
}

/** Renders fields-report.md from a finished run. Pure: no I/O besides `readFile`. */
export function renderReport(input: ReportInput): string {
  const { run, host } = input;
  const now = input.now ?? new Date();
  const out: string[] = [];
  const listings = run.pages.filter((p) => p.kind === 'listing');
  const details = run.pages.filter((p) => p.kind === 'detail');

  out.push(`# Fields report: ${run.platform}`, '');
  out.push(`- Run: ${run.startedAt} to ${run.finishedAt} (${run.headless ? 'headless' : 'headed'})`);
  out.push(`- Page loads: ${run.pages.length} (${listings.length} listing, ${details.length} detail)`);
  out.push(`- Stopped early: ${run.stoppedReason ?? 'no'}`);
  out.push('- Raw HTML and JSON responses are saved next to this file. Credentials are never read; review before sharing.', '');

  // --- URL parameters ---
  out.push('## URL parameters', '');
  const used = observeParams(run.pages.map((p) => p.requestedUrl));
  out.push('### Used (built by the connector)', '');
  if (used.length) {
    out.push('| Parameter | Values | Marked unverified in the report |', '|---|---|---|');
    const unverified = new Set(run.pages.flatMap((p) => p.unverifiedParams));
    for (const p of used) out.push(`| \`${p.name}\` | ${cell(p.values.join(', '))} | ${unverified.has(p.name) ? 'yes' : 'no'} |`);
  } else out.push('_None._');
  out.push('');
  const observedUrls = run.pages.flatMap((p) => [p.finalUrl, ...p.jsonResponses.map((r) => r.url)]).map(redactUrl);
  const observed = observeParams(observedUrls);
  const usedNames = new Set(used.map((u) => u.name));
  out.push('### Observed (final URLs and JSON requests; names not built by us are new findings)', '');
  if (observed.length) {
    out.push('| Parameter | Values seen | New |', '|---|---|---|');
    for (const p of observed) out.push(`| \`${p.name}\` | ${cell(p.values.join(', '))} | ${usedNames.has(p.name) ? '' : 'new'} |`);
  } else out.push('_None._');
  out.push('');

  // --- Pagination ---
  out.push('## Pagination', '');
  const rows: string[] = [];
  const idsSeen = new Set<string>();
  for (const p of listings) {
    if (!p.htmlFile) continue;
    const jobs = parseListing(run.platform, input.readFile(p.htmlFile), host, now);
    const ids = jobs.map((j) => j.externalId);
    const repeated = ids.filter((id) => idsSeen.has(id)).length;
    ids.forEach((id) => idsSeen.add(id));
    rows.push(`| ${p.criteriaLabel} | ${p.page} | ${jobs.length} | ${new Set(ids).size} | ${repeated} |`);
  }
  if (rows.length) out.push('| Search | Page | Cards parsed | Unique ids | Already seen on earlier pages |', '|---|---|---|---|---|', ...rows);
  else out.push('_No listing page parsed._');
  if (run.platform === 'wttj') out.push('', 'WTTJ listings are rendered client-side: check the JSON responses below for the page size.');
  out.push('');

  // --- Listing fields ---
  out.push('## Listing fields (parsed from saved HTML)', '');
  const summaries = listings.flatMap((p) => (p.htmlFile ? parseListing(run.platform, input.readFile(p.htmlFile), host, now) : []));
  out.push(summaries.length ? `Cards parsed: ${summaries.length}. If this is 0 on a page that shows results, the card selectors in the parser need updating.` : 'No cards parsed.', '');
  out.push(fieldTable(collectFieldStats(summaries.map(flattenSummary))));

  // --- JobPosting JSON-LD ---
  out.push('## JobPosting JSON-LD keys (all pages)', '');
  const postings = run.pages.flatMap((p) => (p.htmlFile ? jobPostings(input.readFile(p.htmlFile)) : []));
  out.push(postings.length ? `JobPosting objects found: ${postings.length}.` : 'No JobPosting JSON-LD found.', '');
  if (postings.length) out.push(fieldTable(collectFieldStats(postings)));

  // --- JSON responses ---
  out.push('## JSON responses observed', '');
  const responses = run.pages.flatMap((p) => p.jsonResponses.map((r) => ({ ...r, page: p.index })));
  if (!responses.length) out.push('_None observed._', '');
  for (const r of responses) {
    let payload: unknown;
    try {
      payload = JSON.parse(input.readFile(r.file));
    } catch {
      continue;
    }
    out.push(`### ${cell(r.url)}`, '', `- Page load #${r.page}, HTTP ${r.status}, ${r.bytes} bytes, file \`${r.file}\``, `- Top-level keys: ${flattenTopKeys(payload).map((k) => `\`${k}\``).join(', ')}`);
    const arrays = recordArrays(payload);
    if (arrays.length) {
      out.push(`- Job-like arrays: ${arrays.map((a) => a.length).join(', ')} item(s)`, '');
      out.push(fieldTable(collectFieldStats(arrays[0] ?? [])));
    } else {
      out.push('', fieldTable(collectFieldStats([payload]).slice(0, 60)));
    }
  }

  // --- Blocks ---
  out.push('## Blocks and captchas', '');
  const blocked = run.pages.filter((p) => p.block.blocked || p.error);
  if (!blocked.length) out.push('None seen.');
  for (const p of blocked) out.push(`- Load #${p.index} (${p.kind}, ${cell(p.criteriaLabel)}): ${p.block.reason ?? p.error} (HTTP ${p.status ?? 'n/a'})`);
  out.push('');

  // --- Timing / robots / skipped ---
  out.push('## Loads', '', '| # | Kind | Search | HTTP | Time (ms) | HTML bytes | Robots disallows | Blocked |', '|---|---|---|---|---|---|---|---|');
  for (const p of run.pages) out.push(`| ${p.index} | ${p.kind} | ${cell(p.criteriaLabel)} | ${p.status ?? ''} | ${p.durationMs} | ${p.htmlBytes} | ${p.robotsDisallowed ? 'yes' : 'no'} | ${p.block.blocked ? 'yes' : 'no'} |`);
  if (run.skippedCombinations.length) out.push('', '### Skipped combinations', '', ...run.skippedCombinations.map((s) => `- ${s}`));
  out.push('');
  return out.join('\n');
}
