import { absoluteUrl, htmlToText, load, text } from '../../html.js';
import { findJobPosting, jobPostingToJob } from '../../jsonld.js';
import {
  buildLocation,
  buildSalary,
  cleanText,
  locationFromText,
  normalizeContract,
  normalizeDate,
  normalizeRemote,
  normalizeSalaryPeriod,
  parseSalaryText,
} from '../../normalize.js';
import type { Job, JobSummary } from '../../types.js';
import { ConnectorError } from '../../types.js';
import { INDEED_DEFAULT_HOST } from './urls.js';

type Json = Record<string, unknown>;

/**
 * Result card selectors. UNVERIFIED: written from public knowledge of the result page (the
 * report could not fetch Indeed). The job key is read from `data-jk`, which is the most stable
 * hook. Re-check with the probe's saved HTML.
 */
export const INDEED_SELECTORS = {
  card: '[data-jk]',
  title: 'h2.jobTitle span[title], h2.jobTitle a span, h2.jobTitle',
  company: '[data-testid="company-name"], .companyName',
  location: '[data-testid="text-location"], .companyLocation',
  snippets: '[data-testid="attribute_snippet_testid"], .salary-snippet-container, .metadata',
  date: '[data-testid="myJobsStateDate"], .date, .new',
  logo: 'img.companyAvatar, img[class*="logo"]',
} as const;

export function parseIndeedResults(html: string, host = INDEED_DEFAULT_HOST, now: Date = new Date()): JobSummary[] {
  const $ = load(html);
  const S = INDEED_SELECTORS;
  const seen = new Set<string>();
  const jobs: JobSummary[] = [];
  $(S.card).each((_, el) => {
    const card = $(el);
    const key = card.attr('data-jk') ?? card.find('a[data-jk]').first().attr('data-jk');
    if (!key || seen.has(key)) return;
    const title = text(card.find(S.title));
    if (!title) return;
    seen.add(key);
    const snippets = card
      .find(S.snippets)
      .map((__, s) => cleanText($(s).text()))
      .get()
      .filter((t): t is string => !!t);
    const salaryText = snippets.find((t) => parseSalaryText(t) !== null);
    const contractText = snippets.find((t) => normalizeContract(t) !== null && !/€|\$|£/.test(t));
    const locationText = text(card.find(S.location));
    const remote = /t[ée]l[ée]travail|remote/i.test(locationText ?? '') ? normalizeRemote(locationText) : null;
    const dateEl = card.find(S.date).first();
    jobs.push({
      source: 'indeed',
      externalId: key,
      title,
      company: text(card.find(S.company)),
      companyLogoUrl: absoluteUrl(card.find(S.logo).first().attr('src'), `https://${host}`),
      location: locationFromText(locationText),
      workMode: remote,
      contract: normalizeContract(contractText),
      salary: salaryText ? parseSalaryText(salaryText) : null,
      postedAt: normalizeDate(dateEl.attr('datetime') ?? dateEl.text(), now),
      url: `https://${host}/viewjob?jk=${key}`,
    });
  });
  return jobs;
}

/** Detail page. Uses JSON-LD when present, then the visible header and description blocks. */
export function parseIndeedDetail(html: string, jobKey: string, host = INDEED_DEFAULT_HOST, now: Date = new Date()): Job {
  const url = `https://${host}/viewjob?jk=${jobKey}`;
  const posting = findJobPosting(html);
  if (posting) {
    const job = jobPostingToJob(posting, { source: 'indeed', url, externalId: jobKey, now });
    job.url = url;
    return job;
  }
  const $ = load(html);
  const title = text($('h1.jobsearch-JobInfoHeader-title, h1[class*="JobInfoHeader"], h1'));
  if (!title) throw new ConnectorError('parse', 'No job title found on Indeed detail page', 'indeed');
  const descHtml = $('#jobDescriptionText').html();
  const info = text($('#salaryInfoAndJobType, [data-testid="jobsearch-OtherJobDetailsContainer"]'));
  const locationText = text($('[data-testid="inlineHeader-companyLocation"], [data-testid="jobsearch-JobInfoHeader-companyLocation"]'));
  return {
    source: 'indeed',
    externalId: jobKey,
    title,
    company: text($('[data-testid="inlineHeader-companyName"], [data-testid="jobsearch-JobInfoHeader-companyNameLink"]')),
    location: locationFromText(locationText),
    workMode: /t[ée]l[ée]travail|remote/i.test(locationText ?? '') ? normalizeRemote(locationText) : null,
    contract: normalizeContract(info),
    salary: parseSalaryText(info),
    postedAt: null,
    url,
    applyUrl: null,
    description: htmlToText(descHtml),
    descriptionHtml: descHtml ?? null,
    validThrough: null,
    experienceLevel: null,
    educationLevel: null,
    sector: null,
    skills: [],
    language: null,
    companyUrl: null,
  };
}

/**
 * The structured record documented in the report (`jobKey`, `location`, `salary` {salaryMin,
 * salaryMax, salaryType, salaryCurrency, isEstimated}, ...). Useful when a host captures Indeed
 * JSON instead of HTML. Salary text such as "45 000 € - 60 000 € par an" is used as a fallback.
 */
export function parseIndeedRecord(rec: Json, now: Date = new Date()): Job | null {
  const key = typeof rec.jobKey === 'string' ? rec.jobKey : null;
  const title = typeof rec.title === 'string' ? cleanText(rec.title) : null;
  if (!key || !title) return null;
  const loc = rec.location && typeof rec.location === 'object' ? (rec.location as Json) : {};
  const sal = rec.salary && typeof rec.salary === 'object' ? (rec.salary as Json) : null;
  const salary = sal
    ? (buildSalary({
        min: sal.salaryMin,
        max: sal.salaryMax,
        currency: sal.salaryCurrency,
        period: sal.salaryType,
        isEstimated: typeof sal.isEstimated === 'boolean' ? sal.isEstimated : undefined,
      }) ?? parseSalaryText(sal.salaryText))
    : null;
  if (salary && !salary.period && sal) salary.period = normalizeSalaryPeriod(sal.salaryText);
  const descHtml = typeof rec.descriptionHtml === 'string' ? rec.descriptionHtml : null;
  return {
    source: 'indeed',
    externalId: key,
    title,
    company: typeof rec.companyName === 'string' ? cleanText(rec.companyName) : null,
    location: buildLocation({
      raw: typeof loc.raw === 'string' ? loc.raw : undefined,
      city: typeof loc.city === 'string' ? loc.city : undefined,
      postalCode: typeof loc.postalCode === 'string' ? loc.postalCode : undefined,
      region: typeof loc.admin1Code === 'string' ? loc.admin1Code : undefined,
      countryCode: typeof loc.countryCode === 'string' ? loc.countryCode : undefined,
      latitude: typeof loc.latitude === 'number' ? loc.latitude : undefined,
      longitude: typeof loc.longitude === 'number' ? loc.longitude : undefined,
    }),
    workMode: loc.isRemote === true ? 'remote' : null,
    contract: null,
    salary,
    postedAt: normalizeDate(rec.datePublished, now),
    url: typeof rec.jobUrl === 'string' ? rec.jobUrl : `https://${INDEED_DEFAULT_HOST}/viewjob?jk=${key}`,
    applyUrl: null,
    description: typeof rec.descriptionText === 'string' ? rec.descriptionText : htmlToText(descHtml),
    descriptionHtml: descHtml,
    validThrough: null,
    experienceLevel: null,
    educationLevel: null,
    sector: typeof rec.companyIndustry === 'string' ? cleanText(rec.companyIndustry) : null,
    skills: Array.isArray(rec.attributes) ? rec.attributes.filter((a): a is string => typeof a === 'string') : [],
    language: typeof rec.language === 'string' ? rec.language : null,
    companyUrl: null,
  };
}
