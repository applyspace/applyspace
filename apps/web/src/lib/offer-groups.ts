import fs from 'node:fs/promises';
import path from 'node:path';
import type { OfferGroup, OfferGroupsData } from '@/types/offer-groups';

const DATA_PATH = path.resolve(process.cwd(), 'data', 'offer-groups.json');

const DEFAULT_DATA: OfferGroupsData = { offerGroups: [] };

export async function readOfferGroups(): Promise<OfferGroup[]> {
  try {
    const raw = await fs.readFile(DATA_PATH, 'utf-8');
    const data: OfferGroupsData = { ...DEFAULT_DATA, ...JSON.parse(raw) };
    return data.offerGroups;
  } catch {
    return [];
  }
}
