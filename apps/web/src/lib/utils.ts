import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function excerptDescription(text: string, maxLength = 280): string {
  if (!text) return '';
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= maxLength) return cleaned;
  return cleaned.slice(0, maxLength).trimEnd() + '…';
}

// ── Work mode ────────────────────────────────────────────────────────────────
export type WorkMode = 'hybrid' | 'onsite' | 'remote';

const WORK_MODE_MAP: Record<string, WorkMode> = {
  'hybride':    'hybrid',
  'sur site':   'onsite',
  'présentiel': 'onsite',
  'à distance': 'remote',
  'remote':     'remote',
};

/** Extracts work mode from trailing "(Hybride)" / "(Sur site)" / "(À distance)" suffix. */
export function parseWorkMode(location: string): WorkMode | null {
  const match = location.match(/\(([^)]+)\)\s*$/i);
  if (!match) return null;
  return WORK_MODE_MAP[match[1].toLowerCase().trim()] ?? null;
}

/**
 * Strips the trailing work mode suffix and reduces to "City, Country" only.
 * e.g. "Paris, Île-de-France, France (Hybride)" → "Paris, France"
 */
export function parseLocation(location: string): string {
  const withoutMode = location.replace(/\s*\([^)]+\)\s*$/, '').trim();
  const parts = withoutMode.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]}, ${parts[parts.length - 1]}`;
  return withoutMode;
}

// ── Experience level ─────────────────────────────────────────────────────────
export type ExperienceLevel = 'Junior' | 'Confirmé' | 'Senior' | 'Lead' | 'Directeur';

const EXPERIENCE_PATTERNS: Array<[RegExp, ExperienceLevel]> = [
  [/\b(junior|jr\.?|débutant|entry.?level)\b/i,                              'Junior'],
  [/\b(confirmé|confirmed|intermédiaire|mid.?level|expérimenté)\b/i,         'Confirmé'],
  [/\b(senior|sr\.?|expert)\b/i,                                             'Senior'],
  [/\b(lead|staff|principal|head of|référent)\b/i,                           'Lead'],
  [/\b(directeur|director|vp |c[to]o|chief)\b/i,                             'Directeur'],
];

/** Infers an experience level from the job title, or null if not determinable. */
export function inferExperienceLevel(title: string): ExperienceLevel | null {
  for (const [pattern, level] of EXPERIENCE_PATTERNS) {
    if (pattern.test(title)) return level;
  }
  return null;
}
