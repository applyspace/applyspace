/**
 * Seeds (or resets) the ApplySpace demo account in Supabase.
 *
 *   pnpm demo:seed                       dry run: prints the plan, touches nothing, no network call
 *   pnpm demo:seed --apply --confirm-project <ref> [--reset] [--create-user] [--files-only] [--anchor YYYY-MM-DD]
 *
 * Only run by the founder, after an explicit go (AGENTS.md). Reads from the
 * environment, never from the repo:
 *   NEXT_PUBLIC_SUPABASE_URL      project URL (public)
 *   SUPABASE_SERVICE_ROLE_KEY     secret, needed with --apply, never printed
 *   DEMO_USER_EMAIL               must be on example.com
 *   DEMO_USER_PASSWORD            only with --create-user (creates the user, or resets its password)
 *
 * Idempotent: rows have fixed ids and are upserted, so a re-run changes nothing.
 * --reset first deletes every row of the demo user (and its demo files) so the
 * account goes back to the pristine dataset, discarding what was added by hand.
 */
import { createClient } from '@supabase/supabase-js';
import {
  CONFLICT_COLUMNS,
  DEFAULT_ANCHOR,
  DEMO_TABLES,
  buildDemoDataset,
  isDemoEmail,
  summarize,
} from '@apply/core/demo';

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const option = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const fail = (message: string): never => {
  console.error(`\nStopped: ${message}`);
  process.exit(1);
};

const apply = flag('apply');
const reset = flag('reset');
const createUser = flag('create-user');
const filesOnly = flag('files-only');
const anchor = option('anchor') ?? new Date().toISOString().slice(0, 10);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const email = process.env.DEMO_USER_EMAIL ?? '';
const projectRef = /^https:\/\/([a-z0-9]+)\.supabase\.co\/?$/.exec(url)?.[1] ?? null;

if (!isDemoEmail(email)) fail('DEMO_USER_EMAIL must be set to an address on example.com (for example demo@example.com).');
if (!projectRef) fail('NEXT_PUBLIC_SUPABASE_URL must look like https://<project-ref>.supabase.co.');

// A user id is only known once the user exists; the dry run uses a placeholder.
const PLACEHOLDER_USER = '00000000-0000-4000-8000-000000000000';
const preview = buildDemoDataset({ anchor, userId: PLACEHOLDER_USER });

console.log(`ApplySpace demo seed
  project   ${projectRef}
  demo user ${email}
  anchor    ${anchor}${anchor === DEFAULT_ANCHOR ? ' (same as the default of pnpm demo:sql)' : ''}
  mode      ${apply ? 'APPLY' : 'dry run'}${reset ? ' + reset' : ''}${createUser ? ' + create user' : ''}${filesOnly ? ' (files only)' : ''}
  rows      ${Object.entries(summarize(preview)).map(([k, v]) => `${k} ${v}`).join(', ')}`);

if (!apply) {
  console.log(`
Dry run: nothing was read or written. Steps that --apply would run:
  1. find the auth user ${email}${createUser ? ' (create it if missing, with DEMO_USER_PASSWORD)' : ' (stop if missing)'}
  2. check the migrations are applied (profile data model, applications hub)
  3. set the account to the Max plan, onboarded, with the demo profile header
${reset ? '  4. delete every row of that user in the seeded tables and its demo files in Storage\n' : ''}  ${reset ? '5' : '4'}. upsert ${Object.values(summarize(preview)).reduce((a, b) => a + b, 0) - preview.files.length} rows by fixed id, then upload ${preview.files.length} placeholder PDFs to the "documents" bucket
Review the exact statements (pnpm demo:sql writes supabase/seed/demo-account.sql), then re-run with --apply --confirm-project ${projectRef}.`);
  process.exit(0);
}

if (option('confirm-project') !== projectRef) {
  fail(`pass --confirm-project ${projectRef} to confirm this is the project you mean to write to.`);
}
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
if (!serviceKey) fail('SUPABASE_SERVICE_ROLE_KEY is not set in the environment.');

const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

function must<T>(result: { data: T; error: { message: string } | null }, what: string): T {
  if (result.error) return fail(`${what}: ${result.error.message}`);
  return result.data;
}

async function findUserId(): Promise<string | null> {
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return fail(`listing users: ${error.message}`);
    const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (found) return found.id;
    if (data.users.length < 1000) return null;
  }
}

// 1. The demo auth user ------------------------------------------------------
let userId = await findUserId();
const password = process.env.DEMO_USER_PASSWORD ?? '';
if (!userId) {
  if (!createUser) fail(`no auth user ${email}. Create it in the dashboard (Authentication > Users, auto confirm), or re-run with --create-user.`);
  if (password.length < 12) fail('DEMO_USER_PASSWORD must be set (12 characters or more) to create the user.');
  const created = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: 'Camille Aubert', demo: true },
  });
  if (created.error || !created.data.user) fail(`creating the demo user: ${created.error?.message ?? 'no user returned'}`);
  userId = created.data.user!.id;
  console.log('Created the demo auth user.');
} else if (createUser && password) {
  const updated = await supabase.auth.admin.updateUserById(userId, { password });
  if (updated.error) fail(`updating the demo password: ${updated.error.message}`);
  console.log('Updated the demo user password from DEMO_USER_PASSWORD.');
}
const uid: string = userId;
const dataset = buildDemoDataset({ anchor, userId: uid });

// 2. Files in Storage -------------------------------------------------------
async function uploadFiles() {
  for (const file of dataset.files) {
    const { error } = await supabase.storage
      .from('documents')
      .upload(file.path, file.bytes, { contentType: 'application/pdf', upsert: true });
    if (error) fail(`uploading ${file.path}: ${error.message}`);
  }
  console.log(`Uploaded ${dataset.files.length} placeholder PDFs.`);
}
if (filesOnly) {
  await uploadFiles();
  process.exit(0);
}

// 3. Prerequisites ----------------------------------------------------------
for (const [table, column] of [['languages', 'id'], ['application_documents', 'application_id'], ['applications', 'location'], ['profiles', 'seniority'], ['accounts', 'phone_number']] as const) {
  const { error } = await supabase.from(table).select(column).limit(1);
  if (error) fail(`${table}.${column} is not readable (${error.message}). Apply 20261010000000_profile_data_model and 20261010120000_applications_hub first.`);
}

// 4. Account (the plan first: plan limits read it) ---------------------------
must(await supabase.from('accounts').upsert({ id: uid, email }, { onConflict: 'id', ignoreDuplicates: true }), 'accounts');
must(await supabase.from('accounts').update(dataset.account).eq('id', uid), 'accounts');

// 5. Reset ------------------------------------------------------------------
if (reset) {
  must(await supabase.from('search_no_gos').delete().eq('user_id', uid), 'search_no_gos');
  for (const table of [...DEMO_TABLES].reverse()) {
    must(await supabase.from(table).delete().eq('user_id', uid), table);
  }
  const listed = must(await supabase.storage.from('documents').list(uid, { limit: 1000 }), 'listing demo files') ?? [];
  const demoFiles = listed.filter((f) => f.name.startsWith('demo-')).map((f) => `${uid}/${f.name}`);
  if (demoFiles.length) must(await supabase.storage.from('documents').remove(demoFiles), 'removing demo files');
  console.log('Reset: deleted the demo user rows and files.');
}

// 6. Upsert the dataset -------------------------------------------------------
const CHUNK = 50;
for (const table of DEMO_TABLES) {
  const rows = dataset.tables[table];
  for (let i = 0; i < rows.length; i += CHUNK) {
    must(
      await supabase.from(table).upsert(rows.slice(i, i + CHUNK), { onConflict: CONFLICT_COLUMNS[table] }),
      table,
    );
  }
  console.log(`  ${table.padEnd(22)} ${rows.length}`);
}

const noGoKeys = [...new Set(dataset.searchNoGos.map((n) => n.no_go_key))];
const noGos = must(await supabase.from('no_gos').select('id, key').is('user_id', null).in('key', noGoKeys), 'no_gos') ?? [];
const noGoId = new Map(noGos.map((n) => [n.key as string, n.id as string]));
const searchNoGoRows = dataset.searchNoGos.flatMap((n) => {
  const id = noGoId.get(n.no_go_key);
  return id ? [{ user_id: n.user_id, search_id: n.search_id, no_go_id: id }] : [];
});
if (searchNoGoRows.length) {
  must(await supabase.from('search_no_gos').upsert(searchNoGoRows, { onConflict: CONFLICT_COLUMNS.search_no_gos }), 'search_no_gos');
}
console.log(`  ${'search_no_gos'.padEnd(22)} ${searchNoGoRows.length}`);

await uploadFiles();
console.log(`\nDone. The demo account ${email} is in its seeded state.`);
