import type { ApplicationStatus } from '@apply/core/applications';
import { HUB_STATUSES } from '@/lib/applicationsHub';
import { UUID_RE } from '@/lib/supabase/rows';

/** Form input of a manual application, as the client sends it. Dates are `YYYY-MM-DD`. */
export interface NewApplicationInput {
  companyName: string;
  jobTitle: string;
  url: string;
  location: string;
  status: string;
  appliedAt: string;
  deadlineAt: string;
  notes: string;
  documentIds: string[];
  /** Offer this application comes from, when created from an offer. */
  offerId?: string | null;
}

/** Checked and trimmed input, ready to store. */
export interface NewApplication {
  companyName: string;
  jobTitle: string;
  url: string | null;
  location: string | null;
  status: ApplicationStatus;
  appliedAt: string;
  deadlineAt: string | null;
  notes: string | null;
  documentIds: string[];
  offerId: string | null;
}

export const LIMITS = { company: 120, title: 160, url: 2048, location: 160, notes: 5000, documents: 10 } as const;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** `YYYY-MM-DD` to an ISO timestamp at midnight UTC, or null when it is not a real date. */
export function dayToIso(day: string): string | null {
  if (!DATE_RE.test(day)) return null;
  const t = Date.parse(`${day}T00:00:00Z`);
  return Number.isNaN(t) || new Date(t).toISOString().slice(0, 10) !== day ? null : new Date(t).toISOString();
}

/** Adds https:// to a bare domain; returns null for anything that is not an http(s) link. */
export function normalizeUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(withScheme);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

export type Validation = { ok: true; value: NewApplication } | { ok: false; message: string };

export function validateNewApplication(input: NewApplicationInput): Validation {
  const companyName = input.companyName.trim();
  const jobTitle = input.jobTitle.trim();
  if (!companyName) return { ok: false, message: 'Company is required.' };
  if (!jobTitle) return { ok: false, message: 'Job title is required.' };
  if (companyName.length > LIMITS.company) return { ok: false, message: 'Company name is too long.' };
  if (jobTitle.length > LIMITS.title) return { ok: false, message: 'Job title is too long.' };

  const status = HUB_STATUSES.find((s) => s === input.status);
  if (!status) return { ok: false, message: 'Unknown status.' };

  const appliedAt = dayToIso(input.appliedAt);
  if (!appliedAt) return { ok: false, message: 'Applied date is not valid.' };

  const deadlineAt = input.deadlineAt.trim() ? dayToIso(input.deadlineAt.trim()) : null;
  if (input.deadlineAt.trim() && !deadlineAt) return { ok: false, message: 'Deadline is not valid.' };

  const rawUrl = input.url.trim();
  const url = rawUrl ? normalizeUrl(rawUrl) : null;
  if (rawUrl && (!url || url.length > LIMITS.url)) return { ok: false, message: 'The link is not a valid web address.' };

  const location = input.location.trim();
  const notes = input.notes.trim();
  if (location.length > LIMITS.location) return { ok: false, message: 'Location is too long.' };
  if (notes.length > LIMITS.notes) return { ok: false, message: 'Notes are too long.' };

  const documentIds = [...new Set(input.documentIds)];
  if (documentIds.length > LIMITS.documents || !documentIds.every((id) => UUID_RE.test(id))) {
    return { ok: false, message: 'Invalid documents.' };
  }
  const offerId = input.offerId && UUID_RE.test(input.offerId) ? input.offerId : null;

  return {
    ok: true,
    value: {
      companyName,
      jobTitle,
      url,
      location: location || null,
      status,
      appliedAt,
      deadlineAt,
      notes: notes || null,
      documentIds,
      offerId,
    },
  };
}
