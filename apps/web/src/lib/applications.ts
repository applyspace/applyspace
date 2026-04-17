import fs from 'node:fs/promises';
import path from 'node:path';
import type { Application, Interview, ApplicationsData } from '@/types/applications';

const DATA_PATH = path.resolve(process.cwd(), 'data', 'applications.json');

const DEFAULT_DATA: ApplicationsData = {
  applications: [],
  interviews: [],
};

async function readData(): Promise<ApplicationsData> {
  try {
    const raw = await fs.readFile(DATA_PATH, 'utf-8');
    return { ...DEFAULT_DATA, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_DATA;
  }
}

export async function readApplications(): Promise<Application[]> {
  const data = await readData();
  return data.applications;
}

export async function readInterviews(): Promise<Interview[]> {
  const data = await readData();
  return data.interviews;
}
