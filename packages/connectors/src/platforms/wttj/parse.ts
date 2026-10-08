import { absoluteUrl } from '../../html.js';
import { findJobPosting, jobPostingToJob } from '../../jsonld.js';
import {
  buildLocation,
  buildSalary,
  cleanText,
  normalizeContract,
  normalizeDate,
  normalizeRemote,
} from '../../normalize.js';
import type { Job, JobSummary } from '../../types.js';
import { ConnectorError } from '../../types.js';

const ORIGIN = 'https://www.welcometothejungle.com';

type Json = Record<string, unknown>;

function s(v: unknown): string | null {
  return typeof v === 'string' ? cleanText(v) : typeof v === 'number' ? String(v) : null;
}

/**
 * One search hit in the documented snake_case shape (Notion: "Response (one job)").
 * Fields are `null` when the company does not disclose them. Returns null if the hit has no
 * reference or title.
 */
export function parseWttjHit(hit: Json, now: Date = new Date()): JobSummary | null {
  const externalId = s(hit.reference) ?? s(hit.object_id);
  const title = s(hit.title);
  if (!externalId || !title) return null;
  const org = hit.organization && typeof hit.organization === 'object' ? (hit.organization as Json) : null;
  return {
    source: 'wttj',
    externalId,
    title,
    company: s(hit.company_name) ?? (org ? s(org.name) : null),
    companyLogoUrl: s(hit.company_logo) ?? (org ? s(org.logo) : null),
    location: buildLocation({
      city: s(hit.city) ?? undefined,
      region: s(hit.region) ?? undefined,
      countryCode: s(hit.country_code) ?? undefined,
      latitude: typeof hit.latitude === 'number' ? hit.latitude : undefined,
      longitude: typeof hit.longitude === 'number' ? hit.longitude : undefined,
    }),
    workMode: normalizeRemote(hit.remote_policy),
    contract: normalizeContract(hit.contract_type),
    salary: buildSalary({
      min: hit.salary_minimum,
      max: hit.salary_maximum,
      currency: hit.salary_currency,
      period: hit.salary_period,
    }),
    postedAt: normalizeDate(hit.published_at ?? hit.date_posted, now),
    url: absoluteUrl(hit.url, ORIGIN) ?? '',
  };
}

/** Accepts an array of hits, `{ hits }` or `{ results: [{ hits }] }` (Algolia style multi-query). */
export function parseWttjHits(payload: unknown, now: Date = new Date()): JobSummary[] {
  const hits: unknown[] = [];
  const collect = (node: unknown) => {
    if (Array.isArray(node)) node.forEach(collect);
    else if (node && typeof node === 'object') {
      const o = node as Json;
      if (Array.isArray(o.hits)) hits.push(...o.hits);
      else if (Array.isArray(o.results)) collect(o.results);
      else if (typeof o.reference === 'string' || typeof o.title === 'string') hits.push(o);
    }
  };
  collect(payload);
  return hits
    .filter((h): h is Json => !!h && typeof h === 'object')
    .map((h) => parseWttjHit(h, now))
    .filter((j): j is JobSummary => j !== null);
}

/** Job page: schema.org JobPosting JSON-LD. `fallbackId` is used if the posting has no identifier. */
export function parseWttjJobPage(html: string, pageUrl: string, now: Date = new Date()): Job {
  const posting = findJobPosting(html);
  if (!posting) throw new ConnectorError('parse', 'No JobPosting JSON-LD on page', 'wttj');
  const identifier = posting.identifier;
  const id =
    (identifier && typeof identifier === 'object' ? s((identifier as Json).value) : s(identifier)) ??
    pageUrl.split('/').filter(Boolean).pop() ??
    pageUrl;
  return jobPostingToJob(posting, { source: 'wttj', url: pageUrl, externalId: id, now });
}
