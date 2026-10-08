import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { writeSettings } from '@/lib/settings';
import type { LinkedInProfile } from '@apply/core/linkedin';

const OUTPUT_DIR = process.env.DATA_DIR ?? path.resolve(process.cwd(), '..', '.local', 'output');
const PROFILE_PATH = path.join(OUTPUT_DIR, 'linkedin-profile.json');
const FRESHNESS_MS = 5 * 60 * 1000; // 5 minutes

async function readCachedProfile(): Promise<LinkedInProfile | null> {
  try {
    const raw = await fs.readFile(PROFILE_PATH, 'utf-8');
    const profile: LinkedInProfile = JSON.parse(raw);
    const age = Date.now() - new Date(profile.fetchedAt).getTime();
    if (age < FRESHNESS_MS) return profile;
    return null;
  } catch {
    return null;
  }
}

function runScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    const root = path.resolve(process.cwd(), '../..');
    const child = spawn('pnpm', ['linkedin:profile'], {
      cwd: root,
      stdio: 'pipe',
    });
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`linkedin:profile exited with code ${code}`));
    });
    child.on('error', reject);
  });
}

export async function POST() {
  try {
    // Use cache if fresh
    let profile = await readCachedProfile();

    if (!profile) {
      await runScript();
      const raw = await fs.readFile(PROFILE_PATH, 'utf-8');
      profile = JSON.parse(raw) as LinkedInProfile;
    }

    // Pre-fill matching settings fields
    await writeSettings({
      firstName: profile.firstName,
      lastName: profile.lastName,
      jobTitle: profile.jobTitle,
      location: profile.location,
    });

    return Response.json({ ok: true, profile });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const raw = await fs.readFile(PROFILE_PATH, 'utf-8');
    const profile: LinkedInProfile = JSON.parse(raw);
    return Response.json({ ok: true, profile });
  } catch {
    return Response.json({ ok: false, profile: null });
  }
}
