import { readApplications, readInterviews } from '@/lib/applications';
import { readSettings } from '@/lib/settings';
import type { ApplicationStatus, InterviewStage } from '@apply/core/applications';

export interface HomeNextInterview {
  companyName: string;
  jobTitle: string;
  /** ISO date-time of the interview (`interviews.scheduledAt`). */
  startsAt: string;
  stage: InterviewStage;
}

export interface HomeSummary {
  firstName: string;
  lastName: string;
  applicationsSent: number;
  answersReceived: number;
  nextInterview: HomeNextInterview | null;
  hasCv: boolean;
}

/**
 * Statuses that mean the company replied. `waiting` and `ghosted` are silence;
 * `withdrawn` is the candidate's own move, so it only counts when an interview
 * exists for that application (see below).
 */
const ANSWERED_STATUSES: ReadonlySet<ApplicationStatus> = new Set([
  'interviewing',
  'accepted',
  'rejected',
]);

/**
 * Everything the Home page shows, built from the shared readers (Supabase when
 * signed in, SQLite in demo and desktop mode).
 */
export async function readHomeSummary(): Promise<HomeSummary> {
  const [settings, applications, interviews] = await Promise.all([
    readSettings(),
    readApplications(),
    readInterviews(),
  ]);

  // An application with at least one interview got an answer, whatever its status.
  const interviewed = new Set(interviews.map((i) => i.applicationId));
  const answersReceived = applications.filter(
    (a) => ANSWERED_STATUSES.has(a.status) || interviewed.has(a.id),
  ).length;

  const now = Date.now();
  const upcoming = interviews
    .filter((i) => i.scheduledAt && !i.completedAt && Date.parse(i.scheduledAt) >= now)
    .sort((a, b) => Date.parse(a.scheduledAt!) - Date.parse(b.scheduledAt!))[0];

  return {
    firstName: settings.firstName,
    lastName: settings.lastName,
    // Every row in `applications` is an application that was sent.
    applicationsSent: applications.length,
    answersReceived,
    nextInterview: upcoming
      ? {
          companyName: upcoming.application.company.name,
          jobTitle: upcoming.application.jobTitle,
          startsAt: upcoming.scheduledAt!,
          stage: upcoming.stage,
        }
      : null,
    // TODO: derive from the documents table once it exists (created by another agent).
    hasCv: false,
  };
}
