import type { ExperienceLevel, RemoteMode } from '@apply/db';

// The UI historically used numbers in "k€" (e.g. 40 means 40k). The DB stores
// raw euros. Convert at the boundary so the UI stays unchanged.
const EUR_PER_K = 1000;
export const toK = (eur: number | null | undefined): number | null =>
  eur == null ? null : Math.round(eur / EUR_PER_K);
export const toEur = (k: number | null | undefined): number | null =>
  k == null ? null : k * EUR_PER_K;

const REMOTE_LABELS_EN: Record<RemoteMode, string> = {
  remote: 'Remote',
  hybrid: 'Hybrid',
  onsite: 'On-site',
};

export function labelFromRemoteMode(mode: RemoteMode | null): string[] {
  return mode ? [REMOTE_LABELS_EN[mode]] : [];
}

export function remoteModeFromLabels(labels: readonly string[]): RemoteMode | null {
  const norm = labels.map((l) => l.toLowerCase());
  if (norm.includes('remote') || norm.includes('télétravail') || norm.includes('teletravail')) {
    return 'remote';
  }
  if (norm.includes('hybrid') || norm.includes('hybride')) return 'hybrid';
  if (norm.includes('on-site') || norm.includes('onsite') || norm.includes('présentiel') || norm.includes('presentiel')) {
    return 'onsite';
  }
  return null;
}

// Experience levels: DB stores canonical lowercase tokens (CHECK constraint).
// The UI historically used the French-canonical forms as keys
// ('Junior' | 'Confirmé' | 'Senior' | 'Lead'), translated at render time via
// the local LEVEL_EN / experienceOptions maps. We round-trip those forms so
// every existing callsite (settings form chips, offers criteria row) works
// unchanged.
const EXPERIENCE_LABELS: Record<ExperienceLevel, string> = {
  entry: 'Junior',
  mid: 'Confirmé',
  senior: 'Senior',
  lead: 'Lead',
};

export function labelsFromExperienceLevels(
  levels: readonly ExperienceLevel[] | null | undefined,
): string[] {
  return (levels ?? []).map((l) => EXPERIENCE_LABELS[l]).filter(Boolean);
}

export function experienceLevelsFromLabels(labels: readonly string[]): ExperienceLevel[] {
  const out: ExperienceLevel[] = [];
  for (const raw of labels) {
    const l = raw.trim().toLowerCase();
    if (!l) continue;
    if (l === 'entry' || l === 'junior' || l === 'débutant' || l === 'debutant' || l === 'jr') {
      out.push('entry');
    } else if (l === 'mid' || l === 'confirmed' || l === 'confirmé' || l === 'confirme' || l === 'intermédiaire' || l === 'intermediaire') {
      out.push('mid');
    } else if (l === 'senior' || l === 'sénior' || l === 'sr') {
      out.push('senior');
    } else if (l === 'lead' || l === 'staff' || l === 'principal') {
      out.push('lead');
    }
  }
  // Dedup while preserving order.
  return Array.from(new Set(out));
}

export function slugify(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
