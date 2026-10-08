import { extractJsonLd } from '../jsonld.js';
import { parseHelloWorkListing } from '../platforms/hellowork/parse.js';
import { parseIndeedResults } from '../platforms/indeed/parse.js';
import { parseLinkedInGuestCards } from '../platforms/linkedin/parse.js';
import type { JobSummary, Platform } from '../types.js';

export interface FieldStat {
  path: string;
  types: string[];
  /** Items where the field is present and not null/empty. */
  filled: number;
  /** Items the field could have been in. */
  total: number;
  example: string | null;
}

const EXAMPLE_MAX = 90;

function typeOf(v: unknown): string {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  return typeof v;
}

function isFilled(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === 'string') return v.trim() !== '';
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

function show(v: unknown): string {
  const s = typeof v === 'string' ? v : JSON.stringify(v);
  const one = (s ?? '').replace(/\s+/g, ' ');
  return one.length > EXAMPLE_MAX ? `${one.slice(0, EXAMPLE_MAX)}…` : one;
}

/**
 * Collects per-path stats over a list of records. Arrays collapse to `[]`; `total` for a path is
 * the number of items of its nearest enclosing array (or 1 per record when there is none).
 */
export function collectFieldStats(records: unknown[]): FieldStat[] {
  const stats = new Map<string, { types: Set<string>; filled: number; container: string; example: string | null }>();
  const containerTotals = new Map<string, number>();

  const visit = (value: unknown, path: string, container: string) => {
    if (Array.isArray(value)) {
      const childPath = `${path}[]`;
      containerTotals.set(childPath, (containerTotals.get(childPath) ?? 0) + value.length);
      for (const item of value) {
        if (item && typeof item === 'object' && !Array.isArray(item)) visitObject(item as Record<string, unknown>, childPath, childPath);
        else record(childPath, item, container);
      }
      return;
    }
    if (value && typeof value === 'object') visitObject(value as Record<string, unknown>, path, container);
  };
  const record = (path: string, value: unknown, container: string) => {
    const s = stats.get(path) ?? { types: new Set<string>(), filled: 0, container, example: null };
    s.types.add(typeOf(value));
    if (isFilled(value)) {
      s.filled += 1;
      if (s.example === null) s.example = show(value);
    }
    stats.set(path, s);
  };
  const visitObject = (obj: Record<string, unknown>, path: string, container: string) => {
    for (const [k, v] of Object.entries(obj)) {
      const p = path ? `${path}.${k}` : k;
      if (v && typeof v === 'object') {
        record(p, v, container);
        visit(v, p, container);
      } else record(p, v, container);
    }
  };

  containerTotals.set('', records.length);
  for (const r of records) visit(r, '', '');
  return [...stats.entries()]
    .map(([path, s]) => ({
      path,
      types: [...s.types].sort(),
      filled: s.filled,
      total: containerTotals.get(s.container) ?? records.length,
      example: s.example,
    }))
    .sort((a, b) => a.path.localeCompare(b.path));
}

export function parseListing(platform: Platform, html: string, host: string, now: Date): JobSummary[] {
  switch (platform) {
    case 'hellowork':
      return parseHelloWorkListing(html, now).jobs;
    case 'indeed':
      return parseIndeedResults(html, host, now);
    case 'linkedin':
      return parseLinkedInGuestCards(html, now);
    case 'wttj':
      // WTTJ listings are rendered client-side from the index; HTML has no cards to parse.
      return [];
  }
}

/** JobPosting JSON-LD objects found in a page, keys flattened. */
export function jobPostings(html: string): Record<string, unknown>[] {
  return extractJsonLd(html).filter((n) => {
    const t = n['@type'];
    return t === 'JobPosting' || (Array.isArray(t) && t.includes('JobPosting'));
  });
}

/** Returns the arrays of job-like objects inside a JSON response (objects with a title or id field). */
export function recordArrays(payload: unknown): unknown[][] {
  const found: unknown[][] = [];
  const walk = (node: unknown, depth: number) => {
    if (depth > 8) return;
    if (Array.isArray(node)) {
      const objs = node.filter((x) => x && typeof x === 'object' && !Array.isArray(x));
      const jobLike = objs.filter((o) => 'title' in (o as object) || 'jobKey' in (o as object) || 'reference' in (o as object) || 'job_title' in (o as object));
      if (jobLike.length >= 2 || (jobLike.length === 1 && objs.length === 1)) found.push(jobLike);
      else node.forEach((n) => walk(n, depth + 1));
    } else if (node && typeof node === 'object') {
      Object.values(node).forEach((v) => walk(v, depth + 1));
    }
  };
  walk(payload, 0);
  return found;
}

export interface ParamObservation {
  name: string;
  values: string[];
}

/** Query parameter names and up to 5 distinct values seen across URLs. */
export function observeParams(urls: string[]): ParamObservation[] {
  const map = new Map<string, Set<string>>();
  for (const raw of urls) {
    try {
      for (const [k, v] of new URL(raw).searchParams) {
        const set = map.get(k) ?? new Set<string>();
        if (set.size < 5) set.add(v);
        map.set(k, set);
      }
    } catch {
      // ignore malformed URLs
    }
  }
  return [...map.entries()].map(([name, values]) => ({ name, values: [...values] })).sort((a, b) => a.name.localeCompare(b.name));
}

export function flattenTopKeys(payload: unknown): string[] {
  if (Array.isArray(payload)) return ['(array)'];
  if (payload && typeof payload === 'object') return Object.keys(payload);
  return [typeof payload];
}
