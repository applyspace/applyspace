/**
 * Public Supabase settings. Both values are safe to expose to the browser
 * (the publishable key is limited by Row Level Security), so they ship as
 * `NEXT_PUBLIC_*` variables. When they are missing (local dev without a
 * Supabase project, hosted demo), auth is simply switched off.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
