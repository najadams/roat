const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const users = [
  { email: 'admin@argus.gipc', password: 'Admin@Argus2026', full_name: 'Regional Admin', role: 'regional_admin', zonal_office: null },
  { email: 'kumasi@argus.gipc', password: 'Kumasi@Argus2026', full_name: 'Kumasi Officer', role: 'zonal_officer', zonal_office: 'kumasi' },
  { email: 'tamale@argus.gipc', password: 'Tamale@Argus2026', full_name: 'Tamale Officer', role: 'zonal_officer', zonal_office: 'tamale' },
  { email: 'viewer@argus.gipc', password: 'Viewer@Argus2026', full_name: 'Reports Viewer', role: 'viewer', zonal_office: null },
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

  // PATCH the profile (created by the handle_new_user trigger)
  const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${uid}`, {
    method: 'PATCH',
    headers: { ...headers, 'Prefer': 'return=minimal' },
    body: JSON.stringify({
      full_name: u.full_name,
      role: u.role,
      zonal_office: u.zonal_office,
    }),
  });

  if (!patchRes.ok) {
    const e = await patchRes.text();
    console.error(`Profile patch failed for ${u.email}:`, e);
    continue;
  }

  // If trigger didn't fire (no row existed), PATCH returns 204 with 0 rows affected — insert instead
  const contentRange = patchRes.headers.get('content-range');
  if (contentRange === '*/0') {
    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'return=minimal' },
      body: JSON.stringify({ id: uid, email: u.email, full_name: u.full_name, role: u.role, zonal_office: u.zonal_office }),
    });
    if (!insertRes.ok) {
      console.error(`Profile insert failed for ${u.email}:`, await insertRes.text());
      continue;
    }
  }

  console.log(`✓  ${u.email} | role: ${u.role} | zone: ${u.zonal_office ?? 'all'}`);
}
