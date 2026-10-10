import fs from 'node:fs';
import path from 'node:path';
import type { ShotRatio } from '@/site/content/types';

/**
 * Static website visuals in `apps/web/public/site`. Pages are rendered at build time (and on
 * revalidation), so a file dropped in the folder replaces its placeholder on the next build.
 * The list of slots and their sizes is in docs/website-shots.md.
 */
const PUBLIC_DIR = path.join(process.cwd(), 'public');
const SAFE_NAME = /^[a-z0-9][a-z0-9-]*$/;

function publicFile(relative: string): string | null {
  try {
    return fs.existsSync(path.join(PUBLIC_DIR, relative)) ? `/${relative}` : null;
  } catch {
    return null;
  }
}

/** `/site/shots/<name>.avif` when the file exists, otherwise null. Names are kebab-case only. */
export function shotSrc(name: string): string | null {
  if (!SAFE_NAME.test(name)) return null;
  return publicFile(`site/shots/${name}.avif`);
}

/** `/site/boards/<key>.svg` (job board logo from Brandfetch) when the file exists. */
export function boardLogoSrc(key: string): string | null {
  if (!SAFE_NAME.test(key)) return null;
  return publicFile(`site/boards/${key}.svg`);
}

/** Intrinsic export size (2x) per ratio, used for width/height so images never shift the layout. */
export const SHOT_SIZE: Record<ShotRatio, { width: number; height: number }> = {
  '16/10': { width: 2240, height: 1400 },
  '4/3': { width: 1600, height: 1200 },
  '4/5': { width: 1080, height: 1350 },
  '3/2': { width: 1200, height: 800 },
  '1/1': { width: 800, height: 800 },
};

/** Literal Tailwind classes (the scanner needs full class names). */
export const RATIO_CLASS: Record<ShotRatio, string> = {
  '16/10': 'aspect-[16/10]',
  '4/3': 'aspect-[4/3]',
  '4/5': 'aspect-[4/5]',
  '3/2': 'aspect-[3/2]',
  '1/1': 'aspect-square',
};

export const SM_RATIO_CLASS: Record<ShotRatio, string> = {
  '16/10': 'sm:aspect-[16/10]',
  '4/3': 'sm:aspect-[4/3]',
  '4/5': 'sm:aspect-[4/5]',
  '3/2': 'sm:aspect-[3/2]',
  '1/1': 'sm:aspect-square',
};
