import fs from 'node:fs/promises';
import path from 'node:path';
import type { Job, ScrapedOutput } from '@/types/jobs';

// turbopackIgnore: true
// Walk up from cwd until we find the .local directory (handles both worktree and main repo)
function findOutputDir(): string {
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    const candidate = path.join(dir, '.local', 'output');
    try {
      // sync check — runs once at module init
      require('fs').accessSync(candidate);
      return candidate;
    } catch {
      dir = path.dirname(dir);
    }
  }
  return path.join(process.cwd(), '..', '.local', 'output');
}

const OUTPUT_DIR = process.env.DATA_DIR ?? findOutputDir();

export async function readJobs(): Promise<{ jobs: Job[]; scrapedAt: string | null }> {
  // Try merged file first, then per-platform fallback
  for (const filename of ['jobs.json', 'jobs-linkedin.json', 'jobs-wttj.json']) {
    try {
      const raw = await fs.readFile(path.join(OUTPUT_DIR, filename), 'utf-8');
      const parsed: ScrapedOutput = JSON.parse(raw);
      if (parsed.jobs?.length > 0) {
        return { jobs: parsed.jobs, scrapedAt: parsed.scrapedAt };
      }
    } catch {
      // try next file
    }
  }
  return { jobs: [], scrapedAt: null };
}
