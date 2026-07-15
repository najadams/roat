const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Default password for all seeded accounts. Users are prompted to set their
// own password on first login (profiles.onboarding_completed_at starts NULL).
const DEFAULT_PASSWORD = 'roat@1234';

const users = [
  { email: 'admin@argus.gipc', password: DEFAULT_PASSWORD, full_name: 'Regional Admin', role: 'regional_admin', zonal_office: null },
  { email: 'kumasi@argus.gipc', password: DEFAULT_PASSWORD, full_name: 'Kumasi Officer', role: 'zonal_officer', zonal_office: 'kumasi' },
  { email: 'tamale@argus.gipc', password: DEFAULT_PASSWORD, full_name: 'Tamale Officer', role: 'zonal_officer', zonal_office: 'tamale' },
  { email: 'viewer@argus.gipc', password: DEFAULT_PASSWORD, full_name: 'Reports Viewer', role: 'viewer', zonal_office: null },
];

const headers = {
  'Content-Type': 'application/json',
  'apikey': SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
};

// Fetch all existing auth users
const listRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=50`, { headers });
const listData = await listRes.json();
const existingUsers = listData.users ?? [];

for (const u of users) {
  // Find or create auth user
  let uid = existingUsers.find(x => x.email === u.email)?.id;

  if (!uid) {
    const authRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ email: u.email, password: u.password, email_confirm: true }),
    });
    const authData = await authRes.json();
    if (!authRes.ok) { console.error(`Auth create failed for ${u.email}:`, authData); continue; }
    uid = authData.id;
  } else {
    // Update password for existing user
    await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${uid}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ password: u.password }),
    });
  }

  // Upsert the profile. Works whether or not a handle_new_user trigger
  // pre-created the row — merge-duplicates resolves on the primary key (id).
  const upsertRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
    method: 'POST',
    headers: { ...headers, 'Prefer': 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({
      id: uid,
      email: u.email,
      full_name: u.full_name,
      role: u.role,
      zonal_office: u.zonal_office,
    }),
  });

  if (!upsertRes.ok) {
    console.error(`Profile upsert failed for ${u.email}:`, await upsertRes.text());
    continue;
  }

  console.log(`✓  ${u.email} | role: ${u.role} | zone: ${u.zonal_office ?? 'all'}`);
}
