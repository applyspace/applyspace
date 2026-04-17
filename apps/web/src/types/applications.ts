export type ApplicationStatus = 'pending-waiting' | 'accepted' | 'rejected';

export type InterviewStage = 'HR Interview' | 'Manager' | 'Design Case' | 'Team-Fit' | 'Technical';

export interface Application {
  id: string;
  company: string;
  jobTitle: string;
  appliedAt: string; // ISO date string
  status: ApplicationStatus;
  profileId?: string;
}

export interface Interview {
  id: string;
  applicationId: string;
  company: string;
  jobTitle: string;
  stage: InterviewStage;
}

export interface ApplicationsData {
  applications: Application[];
  interviews: Interview[];
}
