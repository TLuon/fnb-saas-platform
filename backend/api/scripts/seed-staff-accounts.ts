import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ioekhkpzrpuivzzannvn.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlvZWtoa3B6cnB1aXZ6emFubnZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODc1Nzg5MiwiZXhwIjoyMTA0MzMzODkyfQ.PSQ0StG_pyomaoFafAO9Jvd5kqd2nxu87MvmLBTj454';

const TENANT_ID = '11111111-1111-1111-1111-111111111111';
const BRANCH_ID = '22222222-2222-2222-2222-222222222222';

async function seedStaffAccounts() {
  console.log('[SEED-STAFF] Connecting to Supabase...');
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const accounts = [
    {
      email: 'staff.runtime@example.com',
      password: 'abc12345',
      fullName: 'Nhân viên Đứng Quầy (POS)',
      phone: '0901111001',
      staffRole: 'CASHIER'
    },
    {
      email: 'bep.runtime@example.com',
      password: 'bep12345',
      fullName: 'Bếp Trưởng (Kitchen)',
      phone: '0901111002',
      staffRole: 'KITCHEN'
    },
    {
      email: 'bar.runtime@example.com',
      password: 'bar12345',
      fullName: 'Bar Trưởng (Bar)',
      phone: '0901111003',
      staffRole: 'BAR'
    }
  ];

  for (const acc of accounts) {
    console.log(`[SEED-STAFF] Processing ${acc.email}...`);
    let authId: string | null = null;

    // Check if auth user exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existing = existingUsers?.users?.find(u => u.email?.toLowerCase() === acc.email.toLowerCase());

    if (existing) {
      authId = existing.id;
      // Update password & user_metadata
      await supabase.auth.admin.updateUserById(authId, {
        password: acc.password,
        email_confirm: true,
        user_metadata: {
          full_name: acc.fullName,
          staff_role: acc.staffRole
        }
      });
      console.log(`[SEED-STAFF] Updated existing auth user: ${acc.email} (${authId})`);
    } else {
      // Create new auth user
      const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
        email: acc.email,
        password: acc.password,
        email_confirm: true,
        user_metadata: {
          full_name: acc.fullName,
          staff_role: acc.staffRole
        }
      });

      if (createErr || !newUser?.user) {
        console.error(`[SEED-STAFF] Failed to create auth user ${acc.email}:`, createErr);
        continue;
      }
      authId = newUser.user.id;
      console.log(`[SEED-STAFF] Created new auth user: ${acc.email} (${authId})`);
    }

    // Upsert into users table
    const { error: dbErr } = await supabase.from('users').upsert(
      {
        auth_user_id: authId,
        tenant_id: TENANT_ID,
        branch_id: BRANCH_ID,
        full_name: acc.fullName,
        role: 'STAFF',
        phone: acc.phone,
        is_active: true
      },
      { onConflict: 'auth_user_id' }
    );

    if (dbErr) {
      console.error(`[SEED-STAFF] Failed to upsert users table for ${acc.email}:`, dbErr);
    } else {
      console.log(`[SEED-STAFF] Upserted DB user record for ${acc.email}`);
    }
  }

  console.log('[SEED-STAFF] All 3 staff accounts successfully seeded!');
}

seedStaffAccounts().catch(console.error);
