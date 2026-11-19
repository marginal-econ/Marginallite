import { createClient } from '@supabase/supabase-js';

const url = 'https://tmuhpnorjydfijjotvoc.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRtdWhwbm9yanlkZmlqam90dm9jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjIwOTQyNywiZXhwIjoyMTA3Nzg1NDI3fQ.WXBjD-Z797BZmO5D8i7NFHOm-1LhsRxuZm0wYSBitaw';
const supabase = createClient(url, key, { auth: { persistSession: false } });

async function main() {
  const { data: { users }, error } = await supabase.auth.admin.listUsers({ perPage: 100 });
  if (error) {
    console.error('Error listing auth users:', error);
    process.exit(1);
  }
  console.log(`Found ${users.length} auth users in Supabase:`);

  const { data: existingProfiles, error: profError } = await supabase.from('profiles').select('*');
  if (profError) {
    console.error('Error fetching profiles:', profError);
  } else {
    console.log(`Found ${existingProfiles.length} existing rows in public.profiles.`);
  }

  const existingProfileMap = new Map((existingProfiles || []).map(p => [p.id, p]));

  for (const u of users) {
    const existing = existingProfileMap.get(u.id);
    const fullName = existing?.full_name || u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0] || 'Candidate';
    const school = existing?.school || u.user_metadata?.school || null;
    const avatarUrl = existing?.avatar_url || u.user_metadata?.avatar_url || u.user_metadata?.picture || null;
    const role = (u.email === 'marginal.econ.ai@gmail.com') ? 'admin' : (u.user_metadata?.role || 'student');

    console.log(`Processing: ${u.email} (id: ${u.id}) -> Name: ${fullName}, School: ${school}`);

    const { error: upsertProfErr } = await supabase.from('profiles').upsert({
      id: u.id,
      full_name: fullName,
      school: school,
      avatar_url: avatarUrl,
      created_at: existing?.created_at || u.created_at || new Date().toISOString()
    });
    if (upsertProfErr) {
      console.error(`  Failed to upsert profile for ${u.email}:`, upsertProfErr.message);
    } else {
      console.log(`  Profile upserted for ${u.email}`);
    }

    const { error: upsertRoleErr } = await supabase.from('user_roles').upsert({
      user_id: u.id,
      role: role
    });
    if (upsertRoleErr) {
      console.error(`  Failed to upsert role for ${u.email}:`, upsertRoleErr.message);
    }
  }

  const { data: updatedProfiles } = await supabase.from('profiles').select('id, full_name, school');
  console.log(`\nVerification: public.profiles now has ${updatedProfiles?.length} rows.`);
}

main();
