import { absoluteUrl, htmlToText, load, text } from '../../html.js';
import { findJobPosting, jobPostingToJob } from '../../jsonld.js';
import {
  cleanText,
  locationFromText,
  normalizeContract,
  normalizeDate,
  normalizeSeniority,
} from '../../normalize.js';
import type { Job, JobSummary } from '../../types.js';
import { ConnectorError } from '../../types.js';

const ORIGIN = 'https://www.linkedin.com';

/**
 * Guest card selectors. UNVERIFIED: from public knowledge of the guest results markup (the
 * report could not fetch LinkedIn). The job id is read from `data-entity-urn`
 * (`urn:li:jobPosting:{id}`) or the job link. Re-check with the probe's saved HTML.
 */
export const LINKEDIN_SELECTORS = {
  card: '[data-entity-urn*="jobPosting"], .base-card, .job-search-card',
  link: 'a.base-card__full-link, a[href*="/jobs/view/"]',
  title: '.base-search-card__title, h3',
  company: '.base-search-card__subtitle a, .base-search-card__subtitle, h4',
  location: '.job-search-card__location',
  date: 'time',
  logo: 'img.artdeco-entity-image, img[data-delayed-url]',
  badge: '.job-posting-benefits__text, .job-search-card__benefits',
} as const;

const TRACKING_PARAMS = ['refId', 'trackingId', 'trk', 'position', 'pageNum', 'eBP', 'currentJobId', 'originalSubdomain', 'lipi'];

/** Drops tracking parameters from a LinkedIn URL. */
export function cleanLinkedInUrl(href: unknown): string | null {
  const abs = absoluteUrl(href, ORIGIN);
  if (!abs) return null;
  const u = new URL(abs);
  for (const p of TRACKING_PARAMS) u.searchParams.delete(p);
  return u.toString();
}

function idFrom(urnOrHref: string | undefined): string | null {
  if (!urnOrHref) return null;
  return urnOrHref.match(/jobPosting:(\d+)/)?.[1] ?? urnOrHref.match(/(?:-|\/)(\d{6,})(?:[/?]|$)/)?.[1] ?? null;
}

export interface LinkedInCard extends JobSummary {
  /** e.g. "Be an early applicant". */
  benefitBadge: string | null;
}

export function parseLinkedInGuestCards(html: string, now: Date = new Date()): LinkedInCard[] {
  const $ = load(html);
  const S = LINKEDIN_SELECTORS;
  const seen = new Set<string>();
  const out: LinkedInCard[] = [];
  $(S.card).each((_, el) => {
    const card = $(el);
    const href = card.find(S.link).first().attr('href');
    const id = idFrom(card.attr('data-entity-urn')) ?? idFrom(card.find('[data-entity-urn]').first().attr('data-entity-urn')) ?? idFrom(href);
    if (!id || seen.has(id)) return;
    const title = text(card.find(S.title));
    if (!title) return;
    seen.add(id);
    const timeEl = card.find(S.date).first();
    out.push({
      source: 'linkedin',
      externalId: id,
      title,
      company: text(card.find(S.company)),
      companyLogoUrl: absoluteUrl(card.find(S.logo).first().attr('data-delayed-url') ?? card.find(S.logo).first().attr('src'), ORIGIN),
      location: locationFromText(text(card.find(S.location))),
      // Work mode, contract and salary are filter-only on the guest search (report).
      workMode: null,
      contract: null,
      salary: null,
      postedAt: normalizeDate(timeEl.attr('datetime') ?? timeEl.text(), now),
      url: cleanLinkedInUrl(href) ?? `${ORIGIN}/jobs/view/${id}`,
      benefitBadge: text(card.find(S.badge)),
    });
  });
  return out;
}

/** Detail fields beyond the common schema, as listed in the report. */
export interface LinkedInDetailExtras {
  seniorityLevel: string | null;
  employmentType: string | null;
  jobFunction: string | null;
  industries: string | null;
  applicantCountText: string | null;
}

export function parseLinkedInDetail(
  html: string,
  jobId: string,
  now: Date = new Date(),
): { job: Job; extras: LinkedInDetailExtras } {
  const $ = load(html);
  const criteria: Record<string, string> = {};
  $('li.description__job-criteria-item').each((_, li) => {
    const k = cleanText($(li).find('.description__job-criteria-subheader').text());
    const v = cleanText($(li).find('.description__job-criteria-text').text());
    if (k && v) criteria[k.toLowerCase()] = v;
  });
  const extras: LinkedInDetailExtras = {
    seniorityLevel: criteria['seniority level'] ?? criteria["niveau hiérarchique"] ?? null,
    employmentType: criteria['employment type'] ?? criteria['type d’emploi'] ?? null,
    jobFunction: criteria['job function'] ?? criteria['fonction'] ?? null,
    industries: criteria['industries'] ?? criteria['secteurs'] ?? null,
    applicantCountText: text($('.num-applicants__caption, .top-card-layout__first-subline .num-applicants__caption')),
  };
  const url = `${ORIGIN}/jobs/view/${jobId}`;
  const posting = findJobPosting($);
  const fromLd = posting ? jobPostingToJob(posting, { source: 'linkedin', url, externalId: jobId, now }) : null;

  const title = text($('h1.top-card-layout__title, h2.top-card-layout__title, h1')) ?? fromLd?.title ?? null;
  if (!title) throw new ConnectorError('parse', 'No job title found on LinkedIn page', 'linkedin');
  const descHtml = $('.show-more-less-html__markup').first().html();
  const job: Job = {
    source: 'linkedin',
    externalId: jobId,
    title,
    company: text($('a.topcard__org-name-link, .topcard__flavor:first-child')) ?? fromLd?.company ?? null,
    companyLogoUrl: fromLd?.companyLogoUrl ?? null,
    location: locationFromText(text($('.topcard__flavor--bullet'))) ?? fromLd?.location ?? null,
    workMode: fromLd?.workMode ?? null,
    contract: normalizeContract(extras.employmentType) ?? fromLd?.contract ?? null,
    salary: fromLd?.salary ?? null,
    postedAt: normalizeDate($('time').first().attr('datetime') ?? $('.posted-time-ago__text').first().text(), now) ?? fromLd?.postedAt ?? null,
    url,
    applyUrl: fromLd?.applyUrl ?? null,
    description: htmlToText(descHtml) ?? fromLd?.description ?? null,
    descriptionHtml: descHtml ?? fromLd?.descriptionHtml ?? null,
    validThrough: fromLd?.validThrough ?? null,
    experienceLevel: normalizeSeniority(extras.seniorityLevel) ?? fromLd?.experienceLevel ?? null,
    educationLevel: fromLd?.educationLevel ?? null,
    sector: extras.industries ?? fromLd?.sector ?? null,
    skills: fromLd?.skills ?? [],
    language: fromLd?.language ?? null,
    companyUrl: cleanLinkedInUrl($('a.topcard__org-name-link').attr('href')) ?? fromLd?.companyUrl ?? null,
  };
  return { job, extras };
}
