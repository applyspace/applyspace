import type { SupabaseScope } from './scope';

/** Postgres returns at most this many rows per request. */
const PAGE_SIZE = 1000;
/** Keeps `in (...)` URLs well under proxy limits (uuids are 36 chars). */
const ID_CHUNK = 100;

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const toCamel = (key: string) => key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

/**
 * Converts a Supabase row (snake_case columns) to the camelCase shape the
 * Drizzle row types use. Our columns map one to one, so a key rewrite is the
 * whole mapping.
 */
export function camelize<T>(value: unknown): T {
  if (Array.isArray(value)) return value.map((v) => camelize(v)) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [toCamel(k), camelize(v)]),
    ) as T;
  }
  return value as T;
}

export interface RowQuery {
  /** Equality filters, column → value. */
  eq?: Record<string, string>;
  /** Sort order: [column, ascending]. Applied in sequence. */
  order?: ReadonlyArray<readonly [string, boolean]>;
}

/** Fetches every row of a table for the signed-in user, paging past the 1000-row cap. */
export async function selectAll<T>(
  { supabase }: SupabaseScope,
  table: string,
  { eq = {}, order = [] }: RowQuery = {},
): Promise<T[]> {
  const rows: unknown[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    let query = supabase.from(table).select('*');
    for (const [column, value] of Object.entries(eq)) query = query.eq(column, value);
    for (const [column, ascending] of order) query = query.order(column, { ascending });
    const { data, error } = await query.range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`Supabase ${table}: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return camelize<T[]>(rows);
}

/** One row by id, or null (also null for ids that are not uuids). */
export async function selectById<T>(
  { supabase }: SupabaseScope,
  table: string,
  id: string,
): Promise<T | null> {
  if (!UUID_RE.test(id)) return null;
  const { data, error } = await supabase.from(table).select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(`Supabase ${table}: ${error.message}`);
  return data ? camelize<T>(data) : null;
}

/** Rows whose `column` is in `values`, fetched in chunks. */
export async function selectIn<T>(
  { supabase }: SupabaseScope,
  table: string,
  column: string,
  values: readonly string[],
): Promise<T[]> {
  const unique = Array.from(new Set(values));
  const out: unknown[] = [];
  for (let i = 0; i < unique.length; i += ID_CHUNK) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .in(column, unique.slice(i, i + ID_CHUNK));
    if (error) throw new Error(`Supabase ${table}: ${error.message}`);
    out.push(...(data ?? []));
  }
  return camelize<T[]>(out);
}
