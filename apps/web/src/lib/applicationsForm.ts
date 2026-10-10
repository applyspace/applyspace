import { applicationCap } from '@apply/core/applications';
import type { HubDocument } from '@/components/applications/ApplicationForm';
import { getAccount, listDocuments } from '@/lib/candidate-profile';
import { readCompanies } from '@/lib/companies';
import { getSupabaseScope } from '@/lib/supabase/scope';

export interface ApplicationsContext {
  /** False on the demo host, when signed out, and on the desktop without a session. */
  signedIn: boolean;
  /** Plan cap on applications; null when unlimited or unknown. */
  cap: number | null;
  companyNames: string[];
  documents: HubDocument[];
  /** `YYYY-MM-DD` of today (server date). */
  today: string;
}

/** Everything the hub and the creation form need besides the applications themselves. Never throws. */
export async function readApplicationsContext(): Promise<ApplicationsContext> {
  const today = new Date().toISOString().slice(0, 10);
  const scope = await getSupabaseScope();
  if (!scope) return { signedIn: false, cap: null, companyNames: [], documents: [], today };

  const [plan, companies, documents] = await Promise.all([
    getAccount(scope).then((a) => a.plan as string, () => null),
    readCompanies().catch(() => []),
    listDocuments(scope).catch(() => []),
  ]);
  return {
    signedIn: true,
    cap: applicationCap(plan),
    companyNames: companies.map((c) => c.name).sort((a, b) => a.localeCompare(b)),
    documents: documents.map((d) => ({ id: d.id, name: d.name })),
    today,
  };
}
