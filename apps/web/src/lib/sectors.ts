/**
 * Sector config — static registry that will later be replaced by a DB-driven fetch.
 *
 * Shape mirrors what a `sectors` table row would look like:
 *   key (slug), label, icon (hugeicons ref), colors (tailwind badge classes)
 */

import {
  CloudServerIcon,
  BankIcon,
  GraduationScrollIcon,
  Package01Icon,
  Activity01Icon,
  BrushIcon,
  LaptopProgrammingIcon,
  CodeSquareIcon,
  JusticeScale01Icon,
  Leaf01Icon,
} from '@hugeicons/core-free-icons';

export interface SectorConfig {
  key: string;
  label: string;
  icon: typeof CloudServerIcon;
  /** Tailwind classes for the badge (border, bg, text) */
  colors: string;
}

export const SECTORS: SectorConfig[] = [
  {
    key: 'SaaS',
    label: 'SaaS',
    icon: CloudServerIcon,
    colors: 'border-blue-200 bg-blue-50 text-blue-700',
  },
  {
    key: 'FinTech',
    label: 'FinTech',
    icon: BankIcon,
    colors: 'border-green-200 bg-green-50 text-green-700',
  },
  {
    key: 'EdTech',
    label: 'EdTech',
    icon: GraduationScrollIcon,
    colors: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  {
    key: 'E-Commerce',
    label: 'E-Commerce',
    icon: Package01Icon,
    colors: 'border-orange-200 bg-orange-50 text-orange-700',
  },
  {
    key: 'HealthTech',
    label: 'HealthTech',
    icon: Activity01Icon,
    colors: 'border-pink-200 bg-pink-50 text-pink-700',
  },
  {
    key: 'Studio',
    label: 'Studio',
    icon: BrushIcon,
    colors: 'border-purple-200 bg-purple-50 text-purple-700',
  },
  {
    key: 'Agency',
    label: 'Agency',
    icon: LaptopProgrammingIcon,
    colors: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  },
  {
    key: 'IT Services',
    label: 'IT Services',
    icon: CodeSquareIcon,
    colors: 'border-slate-200 bg-slate-50 text-slate-700',
  },
  {
    key: 'LegalTech',
    label: 'LegalTech',
    icon: JusticeScale01Icon,
    colors: 'border-rose-200 bg-rose-50 text-rose-700',
  },
  {
    key: 'GreenTech',
    label: 'GreenTech',
    icon: Leaf01Icon,
    colors: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
];

/** O(1) lookup by key — equivalent to a DB find-by-slug */
export const SECTOR_MAP = new Map<string, SectorConfig>(
  SECTORS.map((s) => [s.key, s]),
);
