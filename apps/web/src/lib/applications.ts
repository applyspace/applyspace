import { desc, eq } from 'drizzle-orm';
import { applications, interviews } from '@apply/db';
import { getDb } from '@/lib/db';
import type {
  ApplicationWithRelations,
  InterviewWithRelations,
} from '@/types/applications';

/**
 * All applications, newest `appliedAt` first. Pre-joins `company` (the FK now
 * owns the company name) and `offer` (nullable — `null` when the user logged
 * an application that didn't come from the scraper).
 */
export async function readApplications(): Promise<ApplicationWithRelations[]> {
  const db = getDb();
  const rows = await db.query.applications.findMany({
    with: { company: true, offer: true },
    orderBy: desc(applications.appliedAt),
  });
  return rows as ApplicationWithRelations[];
}

export async function readApplication(
  id: string,
): Promise<ApplicationWithRelations | null> {
  const db = getDb();
  const row = await db.query.applications.findFirst({
    with: { company: true, offer: true },
    where: eq(applications.id, id),
  });
  return (row as ApplicationWithRelations | undefined) ?? null;
}

/**
 * All interviews, newest `createdAt` first. Pre-joins its parent application
 * and that application's company so the sidebar / list pages can render
 * "{company}, {jobTitle}" without a second query.
 */
export async function readInterviews(): Promise<InterviewWithRelations[]> {
  const db = getDb();
  const rows = await db.query.interviews.findMany({
    with: { application: { with: { company: true } } },
    orderBy: desc(interviews.createdAt),
  });
  return rows as InterviewWithRelations[];
}

export async function readInterview(
  id: string,
): Promise<InterviewWithRelations | null> {
  const db = getDb();
  const row = await db.query.interviews.findFirst({
    with: { application: { with: { company: true } } },
    where: eq(interviews.id, id),
  });
  return (row as InterviewWithRelations | undefined) ?? null;
}
