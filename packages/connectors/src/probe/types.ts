import type { BlockCheck } from '../blocks.js';
import type { Platform } from '../types.js';

export interface JsonResponseRecord {
  /** URL with sensitive query values redacted. */
  url: string;
  status: number;
  file: string;
  bytes: number;
}

export interface PageRecord {
  index: number;
  kind: 'listing' | 'detail';
  page: number;
  criteriaLabel: string;
  requestedUrl: string;
  finalUrl: string;
  status: number | null;
  durationMs: number;
  htmlFile: string | null;
  htmlBytes: number;
  block: BlockCheck;
  unverifiedParams: string[];
  robotsDisallowed: boolean;
  jsonResponses: JsonResponseRecord[];
  error?: string;
}

export interface RunRecord {
  platform: Platform;
  startedAt: string;
  finishedAt: string;
  headless: boolean;
  pages: PageRecord[];
  skippedCombinations: string[];
  stoppedReason: string | null;
}

/** What the probe needs from a browser. The Playwright driver implements it; tests fake it. */
export interface ProbeSession {
  goto(url: string): Promise<{ status: number | null; finalUrl: string; html: string }>;
  /** Called for every JSON response observed while a page loads. */
  onJson(handler: (r: { url: string; status: number; body: string }) => void): void;
  close(): Promise<void>;
}

export interface ProbeDriver {
  open(options: { profileDir: string; headless: boolean }): Promise<ProbeSession>;
}
