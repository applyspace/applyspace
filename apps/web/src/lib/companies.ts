import type { Company } from '@apply/db/schema';
import { getSupabaseScope } from '@/lib/supabase/scope';
import * as supabaseData from '@/lib/supabase/queries';
import { demoCompanies } from '@/lib/demo';
import { IS_DEMO } from '@/lib/hosted';

// Supabase for signed-in users, in-memory fixtures for the hosted demo, nothing otherwise.
export async function readCompanies(): Promise<Company[]> {
  const scope = await getSupabaseScope();
  if (scope) return supabaseData.readCompanies(scope);
  return IS_DEMO ? demoCompanies() : [];
}

export async function readCompany(id: string): Promise<Company | null> {
  const scope = await getSupabaseScope();
  if (scope) return supabaseData.readCompany(scope, id);
  return IS_DEMO ? (demoCompanies().find((c) => c.id === id) ?? null) : null;
}
