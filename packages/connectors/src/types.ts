/**
 * Connector contract and the common job schema (Notion: "Job platforms: data access report",
 * section "Common job schema"). Everything here is platform independent.
 */

export const PLATFORMS = ['wttj', 'hellowork', 'indeed', 'linkedin'] as const;
export type Platform = (typeof PLATFORMS)[number];

export type RemoteMode = 'onsite' | 'hybrid' | 'remote';
export type ContractType =
  | 'permanent'
  | 'fixed_term'
  | 'internship'
  | 'freelance'
  | 'apprenticeship'
  | 'part_time'
  | 'temporary'
  | 'volunteer'
  | 'other';
export type ExperienceLevel = 'entry' | 'mid' | 'senior' | 'lead';
export type SalaryPeriod = 'hour' | 'day' | 'week' | 'month' | 'year';
export type SortOrder = 'relevance' | 'date';

export interface SearchLocation {
  /** Human label as saved in the search profile, e.g. "Paris". */
  label: string;
  /** ISO 3166-1 alpha-2, when known. */
  countryCode?: string;
  /** Postal code, when known (HelloWork canonical URLs need one). */
  postalCode?: string;
}

export interface SearchCriteria {
  jobTitles: string[];
  locations: SearchLocation[];
  remoteModes: RemoteMode[];
  contractTypes: ContractType[];
  experienceLevels: ExperienceLevel[];
  salaryMin?: number;
  salaryCurrency?: string;
  /** Only offers published in the last N days. 0 or undefined = any age. */
  postedWithinDays?: number;
  sort?: SortOrder;
  /** Search radius around the location, in kilometres. */
  radiusKm?: number;
}

export interface JobLocation {
  city?: string;
  postalCode?: string;
  region?: string;
  /** ISO 3166-1 alpha-2 when known. */
  countryCode?: string;
  /** Raw location text as shown by the platform. */
  raw?: string;
  latitude?: number;
  longitude?: number;
}

export interface Salary {
  min: number | null;
  max: number | null;
  /** ISO 4217. */
  currency: string | null;
  period: SalaryPeriod | null;
  /** True when the platform marks the amount as an estimate (Indeed `isEstimated`). */
  isEstimated?: boolean;
  /** Yearly minimum, estimated from `min` and `period` (see `annualize`). */
  yearlyMin: number | null;
}

export interface JobSummary {
  source: Platform;
  /** Platform id: WTTJ `reference`, HelloWork `job_id`, Indeed `jobKey`, LinkedIn `jobId`. */
  externalId: string;
  title: string;
  company: string | null;
  companyLogoUrl?: string | null;
  location: JobLocation | null;
  workMode: RemoteMode | null;
  contract: ContractType | null;
  salary: Salary | null;
  /** ISO 8601 UTC. Relative dates ("il y a 3 jours") resolve to the day, not the minute. */
  postedAt: string | null;
  url: string;
}

export interface Job extends JobSummary {
  applyUrl: string | null;
  description: string | null;
  descriptionHtml?: string | null;
  validThrough: string | null;
  experienceLevel: ExperienceLevel | null;
  educationLevel: string | null;
  sector: string | null;
  skills: string[];
  language: string | null;
  companyUrl: string | null;
}

export interface Connector {
  readonly platform: Platform;
  /** `page` is 1-indexed. Searches the first job title and first location of `criteria`. */
  search(criteria: SearchCriteria, page: number): Promise<JobSummary[]>;
  /** `id` is the platform `externalId` (WTTJ also accepts the job page URL). */
  detail(id: string): Promise<Job>;
}

/** What a connector needs from its host (browser extension, desktop app, probe, tests). */
export interface ConnectorDeps {
  /** Fetches a page as text using the host's own browser context. */
  fetchText(url: string): Promise<string>;
  /** Injectable clock for relative dates. */
  now?(): Date;
}

export type ConnectorErrorCode = 'blocked' | 'parse' | 'unknown_id' | 'unsupported';

export class ConnectorError extends Error {
  constructor(
    readonly code: ConnectorErrorCode,
    message: string,
    readonly platform?: Platform,
  ) {
    super(message);
    this.name = 'ConnectorError';
  }
}

/**
 * Result of a URL builder. `unverifiedParams` lists parameters whose name or format the report
 * marks as unverified; `robotsDisallowed` tells the host that robots.txt blocks this URL.
 */
export interface BuiltUrl {
  url: string;
  params: Record<string, string>;
  unverified: boolean;
  unverifiedParams: string[];
  robotsDisallowed: boolean;
  notes: string[];
}
