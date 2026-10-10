import type {
  Application,
  ApplicationStatus,
  Company,
  Interview,
  InterviewOutcome,
  InterviewStage,
  Offer,
} from '@apply/db/schema';

export type {
  Application,
  ApplicationStatus,
  Interview,
  InterviewOutcome,
  InterviewStage,
};

/**
 * An application row pre-joined with its `company` + (optional) `offer`.
 * Consumers read `app.company.name` etc. Queries must use
 * `db.query.applications.findMany({ with: { company: true, offer: true } })`.
 */
export interface ApplicationWithRelations extends Application {
  company: Company;
  offer: Offer | null;
  /**
   * Hub details (migration 20261010120000_applications_hub). Absent until the
   * migration is applied, so consumers treat them as optional.
   */
  url?: string | null;
  location?: string | null;
  deadlineAt?: string | null;
  respondedAt?: string | null;
}

/** Maximum number of applications per plan; `null` means unlimited. */
export const APPLICATION_CAPS = { free: 15, plus: 99, max: null } as const;

/** Cap for a plan name; unknown plans get the Free cap. */
export function applicationCap(plan: string | null | undefined): number | null {
  if (plan === 'max') return APPLICATION_CAPS.max;
  if (plan === 'plus') return APPLICATION_CAPS.plus;
  return APPLICATION_CAPS.free;
}

/**
 * An interview row pre-joined with its parent application (and that
 * application's company). This is how the sidebar and detail pages read an
 * interview's company name / job title now that `Interview` no longer
 * dénormalise those fields itself.
 */
export interface InterviewWithRelations extends Interview {
  application: Application & { company: Company };
}
