import { asc, eq } from 'drizzle-orm';
import { companies, type Company } from '@apply/db';
import { getDb } from '@/lib/db';

export async function readCompanies(): Promise<Company[]> {
  const db = getDb();
  return db.select().from(companies).orderBy(asc(companies.name)).all();
}

export async function readCompany(id: string): Promise<Company | null> {
  const db = getDb();
  const [row] = await db.select().from(companies).where(eq(companies.id, id)).limit(1);
  return row ?? null;
}
