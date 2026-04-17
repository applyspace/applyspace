import fs from 'node:fs/promises';
import path from 'node:path';
import type { Profile, ProfilesData } from '@/types/profiles';

const DATA_PATH = path.resolve(process.cwd(), 'data', 'profiles.json');

const DEFAULT_DATA: ProfilesData = { profiles: [] };

export async function readProfiles(): Promise<Profile[]> {
  try {
    const raw = await fs.readFile(DATA_PATH, 'utf-8');
    const data: ProfilesData = { ...DEFAULT_DATA, ...JSON.parse(raw) };
    return data.profiles;
  } catch {
    return [];
  }
}
