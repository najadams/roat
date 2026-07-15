import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const CONFIRM_FLAG = '--confirm';
const ENV_FILES = ['.env.local', '.env'];
const PRESERVED_ZONE = 'takoradi';

function loadEnvFiles() {
  for (const file of ENV_FILES) {
    const path = resolve(process.cwd(), file);
    if (!existsSync(path)) continue;

    const contents = readFileSync(path, 'utf8');
    for (const line of contents.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;

      const [key, ...valueParts] = trimmed.split('=');
      if (process.env[key]) continue;

      const rawValue = valueParts.join('=').trim();
      process.env[key] = rawValue.replace(/^['"]|['"]$/g, '');
    }
  }
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

loadEnvFiles();

const confirmed = process.argv.includes(CONFIRM_FLAG);
const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const { count: existingCount, error: countError } = await supabase
  .from('activities')
  .select('id', { count: 'exact', head: true });

if (countError) {
  throw new Error(`Could not count activities: ${countError.message}`);
}

const total = existingCount ?? 0;

const { count: preservedCount, error: preservedCountError } = await supabase
  .from('activities')
  .select('id', { count: 'exact', head: true })
  .eq('zonal_office', PRESERVED_ZONE);

if (preservedCountError) {
  throw new Error(`Could not count preserved Takoradi activities: ${preservedCountError.message}`);
}

const preservedTotal = preservedCount ?? 0;
const deletableTotal = Math.max(total - preservedTotal, 0);

if (!confirmed) {
  console.log(`Dry run: ${deletableTotal} activity row${deletableTotal === 1 ? '' : 's'} would be deleted.`);
  console.log(`Takoradi rows preserved: ${preservedTotal}.`);
  console.log(`Run "npm run db:clear:activities -- ${CONFIRM_FLAG}" to permanently delete them.`);
  process.exit(0);
}

if (deletableTotal === 0) {
  console.log('No activity rows found. Nothing to delete.');
  console.log(`Takoradi rows preserved: ${preservedTotal}.`);
  process.exit(0);
}

const { count: deletedCount, error: deleteError } = await supabase
  .from('activities')
  .delete({ count: 'exact' })
  .neq('zonal_office', PRESERVED_ZONE);

if (deleteError) {
  throw new Error(`Could not delete activities: ${deleteError.message}`);
}

console.log(`Deleted ${deletedCount ?? total} activity row${(deletedCount ?? total) === 1 ? '' : 's'}.`);
console.log(`Takoradi rows preserved: ${preservedTotal}.`);
console.log('Activity attachment database rows were removed by ON DELETE CASCADE.');
