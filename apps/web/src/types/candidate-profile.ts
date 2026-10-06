import type { ExperienceLevel } from '@apply/db';

/**
 * Candidate profile data that only exists in Supabase (signed-in users):
 * experiences, education, skills, documents and the account's onboarding
 * state. Constrained strings mirror the SQL CHECK constraints in
 * `supabase/migrations/20261009000000_profile_education_skills_documents.sql`.
 */

export const SKILL_LEVEL_VALUES = ['beginner', 'intermediate', 'advanced', 'expert'] as const;
export type SkillLevel = (typeof SKILL_LEVEL_VALUES)[number];

export const DOCUMENT_KIND_VALUES = ['cv', 'fit_message', 'other'] as const;
export type DocumentKind = (typeof DOCUMENT_KIND_VALUES)[number];

export const ACCOUNT_PLAN_VALUES = ['free', 'plus'] as const;
export type AccountPlan = (typeof ACCOUNT_PLAN_VALUES)[number];

/** Headcount ranges of `searches.company_sizes`. */
export const SEARCH_COMPANY_SIZE_VALUES = ['0-15', '15-50', '50-500', '500+'] as const;
export type SearchCompanySize = (typeof SEARCH_COMPANY_SIZE_VALUES)[number];

/** File types accepted for a CV, by MIME type. */
export const CV_MIME_TYPES = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
} as const;
export const CV_MAX_BYTES = 10 * 1024 * 1024;
export const DOCUMENTS_BUCKET = 'documents';

export interface Account {
  id: string;
  email: string | null;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  /** Null until onboarding is finished or skipped. */
  onboardedAt: string | null;
  plan: AccountPlan;
  /** False while the `onboarded_at` column does not exist yet (migration not applied). */
  hasOnboardingState: boolean;
}

/** Months are `YYYY-MM` strings in the UI ('' when unset); the database stores the first of the month. */
export interface ExperienceEntry {
  id: string;
  title: string;
  companyId: string | null;
  companyName: string;
  location: string;
  startedAt: string;
  endedAt: string;
  isCurrent: boolean;
  description: string;
}

export interface EducationEntry {
  id: string;
  school: string;
  degree: string;
  field: string;
  startedAt: string;
  endedAt: string;
  description: string;
}

export interface SkillEntry {
  id: string;
  name: string;
  level: SkillLevel | null;
}

export interface DocumentEntry {
  id: string;
  kind: DocumentKind;
  name: string;
  storagePath: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  isPrimary: boolean;
  extractedText: string | null;
  createdAt: string;
}

/** Inputs: same shape as the entries, `id` absent when creating. */
export type ExperienceInput = Omit<ExperienceEntry, 'id' | 'companyId'> & { id?: string };
export type EducationInput = Omit<EducationEntry, 'id'> & { id?: string };
export type SkillInput = Omit<SkillEntry, 'id'> & { id?: string };

export interface DocumentUploadInput {
  kind: Exclude<DocumentKind, 'fit_message'>;
  name: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
}

export interface FitMessageInput {
  id?: string;
  text: string;
}

/** Contract tokens a search may store (the database check accepts exactly these). */
export const CONTRACT_TOKENS = ['CDI', 'CDD', 'Stage', 'Freelance', 'Apprentissage', 'Bénévolat'] as const;
export type ContractToken = (typeof CONTRACT_TOKENS)[number];

export interface FirstSearchInput {
  titles: string[];
  contractTypes: ContractToken[];
  experienceLevels: ExperienceLevel[];
  location: string;
}

/**
 * What the profile editor loads. A section is `null` when its table cannot be
 * read (typically: the migration has not been applied yet).
 */
export type ProfileData =
  | { status: 'signed-out' }
  | {
      status: 'ready';
      experiences: ExperienceEntry[] | null;
      education: EducationEntry[] | null;
      skills: SkillEntry[] | null;
    };

export type DocumentsData =
  | { status: 'signed-out' }
  | { status: 'unavailable' }
  | { status: 'ready'; documents: DocumentEntry[] };

/** Result of a profile mutation. Server actions never throw to the client. */
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; reason: 'signed-out' | 'invalid' | 'unavailable'; message: string };

/** Criteria of a search profile created from the sidebar "New search" dialog. */
export interface NewSearchInput {
  title: string;
  location: string;
  contractTypes: ContractToken[];
  experienceLevels: ExperienceLevel[];
}

/** A search just created: enough to navigate to its page. */
export interface CreatedSearch {
  id: string;
  searchTitle: string;
  location: string | null;
  /** `<title>-<location>-<id>` segment of `/offers/[slug]`. */
  slug: string;
}

/** `plan-limit`: the Free plan already has its one search profile. */
export type CreateSearchResult =
  | ActionResult<CreatedSearch>
  | { ok: false; reason: 'plan-limit'; message: string };
