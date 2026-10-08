import type {
  Application,
  ApplicationStatus,
  Company,
  Interview,
  InterviewOutcome,
  InterviewStage,
  Offer,
} from '@apply/db';

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
