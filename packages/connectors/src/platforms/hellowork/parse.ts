import { absoluteUrl, load, text } from '../../html.js';
import { findJobPosting, jobPostingToJob } from '../../jsonld.js';
import {
  buildLocation,
  cleanText,
  locationFromText,
  normalizeContract,
  normalizeDate,
  normalizeRemote,
  parseSalaryText,
} from '../../normalize.js';
import type { Job, JobSummary } from '../../types.js';
import { ConnectorError } from '../../types.js';

const ORIGIN = 'https://www.hellowork.com';
const JOB_HREF = /\/fr-fr\/emplois\/(\d+)\.html/;

/**
 * Listing card selectors. ASSUMPTION: the report documents the card fields (raw_id, job_url,
 * job_title, company_name, city, contract_type, relative date, logo) but not the markup. These
 * defaults match the synthetic fixture and must be re-checked with the probe's saved HTML.
 * Job ids are found from links to `/fr-fr/emplois/{id}.html`, which does not depend on classes.
 */
export const HELLOWORK_SELECTORS = {
  card: 'li[data-id], article, li',
  title: '[data-cy="offerTitle"], h2, h3',
  company: '[data-cy="companyName"], .company, [class*="company"]',
  location: '[data-cy="localisationCard"], .location, [class*="location"]',
  contract: '[data-cy="contractCard"], .contract, [class*="contract"]',
  tags: '.tag, [class*="tag"]',
  date: 'time, [class*="date"]',
  logo: 'img',
} as const;

export interface HelloWorkListing {
  jobs: JobSummary[];
  /** `Compteur-Offre` from the dataLayer push, when present. */
  totalCount: number | null;
}

export function parseHelloWorkListing(html: string, now: Date = new Date()): HelloWorkListing {
  const $ = load(html);
  const seen = new Set<string>();
  const jobs: JobSummary[] = [];
  const S = HELLOWORK_SELECTORS;

  $('a[href]').each((_, a) => {
    const href = $(a).attr('href') ?? '';
    const id = href.match(JOB_HREF)?.[1];
    if (!id || seen.has(id)) return;
    const card = $(a).closest(S.card);
    const scope = card.length ? card : $(a).parent();
    const title =
      text(scope.find(S.title)) ?? cleanText($(a).attr('title') ?? '') ?? text($(a));
    if (!title) return;
    seen.add(id);

    const tags = scope
      .find(S.tags)
      .map((__, t) => cleanText($(t).text()))
      .get()
      .filter((t): t is string => !!t);
    const contractText = text(scope.find(S.contract)) ?? tags.find((t) => normalizeContract(t));
    const remoteText = tags.find((t) => normalizeRemote(t) !== null && /t[ée]l[ée]travail|remote|hybride/i.test(t));
    const locationText = text(scope.find(S.location));
    const salaryText = tags.find((t) => parseSalaryText(t) !== null);
    const dateEl = scope.find(S.date).first();

    const location = locationFromText(locationText);
    jobs.push({
      source: 'hellowork',
      externalId: id,
      title,
      company: text(scope.find(S.company)),
      companyLogoUrl: absoluteUrl(scope.find(S.logo).first().attr('src'), ORIGIN),
      location: location ? buildLocation(location) : null,
      // Only set when a contract tag exists, as the report notes for remote_policy.
      workMode: contractText ? normalizeRemote(remoteText) : null,
      contract: normalizeContract(contractText),
      salary: salaryText ? parseSalaryText(salaryText) : null,
      postedAt: normalizeDate(dateEl.attr('datetime') ?? dateEl.text(), now),
      url: absoluteUrl(href, ORIGIN) ?? '',
    });
  });

  const count = html.match(/['"]Compteur-Offre['"]\s*:\s*['"]?(\d+)/)?.[1];
  return { jobs, totalCount: count ? Number(count) : null };
}

/** Detail page: JobPosting JSON-LD. The id comes from the URL (`/fr-fr/emplois/{id}.html`). */
export function parseHelloWorkDetail(html: string, pageUrl: string, now: Date = new Date()): Job {
  const posting = findJobPosting(html);
  if (!posting) throw new ConnectorError('parse', 'No JobPosting JSON-LD on page', 'hellowork');
  const id = pageUrl.match(JOB_HREF)?.[1] ?? pageUrl;
  return jobPostingToJob(posting, { source: 'hellowork', url: pageUrl, externalId: id, now });
}
