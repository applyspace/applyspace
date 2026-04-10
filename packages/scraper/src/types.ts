export type Source = 'linkedin' | 'wttj' | 'hellowork' | 'jobsthatmakesense';

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  contract?: string;
  salary?: string;
  description: string;
  url: string;
  source: Source;
  postedAt?: string;
  scrapedAt: string;
}

export interface ScrapedOutput {
  scrapedAt: string;
  total: number;
  jobs: Job[];
}

export interface SearchCriteria {
  titles: string[];
  location: string;
  contractTypes: string[];
  remotePreference: string[];
  experienceLevels?: string[];
  salaryMin?: number;
  salaryMax?: number;
}
