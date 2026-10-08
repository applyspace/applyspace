import type { Doc } from './html.js';
import { htmlToText, load } from './html.js';
import {
  buildLocation,
  buildSalary,
  cleanText,
  experienceFromMonths,
  normalizeContract,
  normalizeDate,
  normalizeRemote,
} from './normalize.js';
import type { Job, JobLocation, Platform, RemoteMode, Salary } from './types.js';

type Json = Record<string, unknown>;

function isObject(v: unknown): v is Json {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function asArray<T>(v: T | T[] | undefined | null): T[] {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

function typeIncludes(node: Json, type: string): boolean {
  return asArray(node['@type'] as string | string[] | undefined).includes(type);
}

/** All JSON-LD objects of a page, flattening arrays and `@graph`. Invalid blocks are skipped. */
export function extractJsonLd(htmlOrDoc: string | Doc): Json[] {
  const $ = typeof htmlOrDoc === 'string' ? load(htmlOrDoc) : htmlOrDoc;
  const out: Json[] = [];
  const visit = (node: unknown) => {
    if (Array.isArray(node)) node.forEach(visit);
    else if (isObject(node)) {
      out.push(node);
      if (node['@graph']) visit(node['@graph']);
    }
  };
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().text().trim();
    if (!raw) return;
    try {
      visit(JSON.parse(raw));
    } catch {
      // Some sites ship slightly invalid JSON-LD; skipping keeps the page usable.
    }
  });
  return out;
}

export function findJobPosting(htmlOrDoc: string | Doc): Json | null {
  return extractJsonLd(htmlOrDoc).find((n) => typeIncludes(n, 'JobPosting')) ?? null;
}

function str(v: unknown): string | null {
  if (typeof v === 'string') return cleanText(v);
  if (typeof v === 'number') return String(v);
  return null;
}

function nameOf(v: unknown): string | null {
  if (typeof v === 'string') return cleanText(v);
  if (isObject(v)) return str(v.name);
  return null;
}

function salaryFromJsonLd(base: unknown): Salary | null {
  if (!isObject(base)) return null;
  const currency = base.currency;
  const value = base.value;
  if (isObject(value)) {
    const single = value.value;
    return buildSalary({
      min: value.minValue ?? single,
      max: value.maxValue ?? (value.minValue === undefined ? undefined : null),
      currency,
      period: value.unitText,
    });
  }
  return buildSalary({ min: value, max: null, currency, period: base.unitText });
}

function locationFromJsonLd(posting: Json): JobLocation | null {
  for (const place of asArray(posting.jobLocation as unknown)) {
    if (!isObject(place)) continue;
    const addr = place.address;
    if (!isObject(addr)) {
      const label = str(addr);
      if (label) return buildLocation({ raw: label, city: label });
      continue;
    }
    const country = isObject(addr.addressCountry) ? str(addr.addressCountry.name) : str(addr.addressCountry);
    const geo = isObject(place.geo) ? place.geo : null;
    return buildLocation({
      city: str(addr.addressLocality) ?? undefined,
      postalCode: str(addr.postalCode) ?? undefined,
      region: str(addr.addressRegion) ?? undefined,
      countryCode: country && /^[A-Za-z]{2}$/.test(country) ? country : undefined,
      raw: str(addr.streetAddress) ?? undefined,
      latitude: geo && typeof geo.latitude === 'number' ? geo.latitude : undefined,
      longitude: geo && typeof geo.longitude === 'number' ? geo.longitude : undefined,
    });
  }
  return null;
}

export interface JobPostingContext {
  source: Platform;
  /** Page URL the JSON-LD was read from. */
  url: string;
  externalId: string;
  now?: Date;
}

/** Maps a schema.org JobPosting to the common `Job`. */
export function jobPostingToJob(posting: Json, ctx: JobPostingContext): Job {
  const now = ctx.now ?? new Date();
  const descriptionHtml = typeof posting.description === 'string' ? posting.description : null;
  const org = isObject(posting.hiringOrganization) ? posting.hiringOrganization : null;
  const experience = posting.experienceRequirements;
  const months =
    isObject(experience) && typeof experience.monthsOfExperience !== 'undefined'
      ? Number(experience.monthsOfExperience)
      : null;
  const education = posting.educationRequirements;
  const educationLevel = isObject(education)
    ? str(education.credentialCategory)
    : str(education);
  const skills = asArray(posting.skills as unknown)
    .flatMap((s) => (typeof s === 'string' ? s.split(/[,;\n]/) : [nameOf(s)]))
    .map((s) => cleanText(s ?? ''))
    .filter((s): s is string => !!s);

  const remote: RemoteMode | null =
    str(posting.jobLocationType) !== null ? normalizeRemote(str(posting.jobLocationType)) : null;
  const logo = org ? (typeof org.logo === 'string' ? org.logo : isObject(org.logo) ? str(org.logo.url) : null) : null;

  return {
    source: ctx.source,
    externalId: ctx.externalId,
    title: str(posting.title) ?? '',
    company: org ? nameOf(org) : null,
    companyLogoUrl: logo,
    companyUrl: org ? (str(org.sameAs) ?? str(org.url)) : null,
    location: locationFromJsonLd(posting),
    workMode: remote,
    contract: normalizeContract(posting.employmentType),
    salary: salaryFromJsonLd(posting.baseSalary),
    postedAt: normalizeDate(posting.datePosted, now),
    validThrough: normalizeDate(posting.validThrough, now),
    url: str(posting.url) ?? ctx.url,
    applyUrl: str(posting.directApply) === 'true' ? ctx.url : null,
    description: htmlToText(descriptionHtml),
    descriptionHtml,
    experienceLevel: months !== null && Number.isFinite(months) ? experienceFromMonths(months) : null,
    educationLevel,
    sector: str(posting.industry),
    skills,
    language: str(posting.inLanguage),
  };
}
