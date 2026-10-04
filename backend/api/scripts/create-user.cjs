const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ioekhkpzrpuivzzannvn.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlvZWtoa3B6cnB1aXZ6emFubnZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODc1Nzg5MiwiZXhwIjoyMTA0MzMzODkyfQ.PSQ0StG_pyomaoFafAO9Jvd5kqd2nxu87MvmLBTj454';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function run() {
  const staffAuthId = 'aaaa1111-0000-0000-0000-000000000001';
  const staffEmail = 'staff1@cafe-and-cake.test';
  const password = 'DemoSecurePass2026!';

  console.log('Creating Supabase Auth user for', staffEmail);
  const { data, error } = await supabase.auth.admin.createUser({
    id: staffAuthId,
    email: staffEmail,
    password: password,
    email_confirm: true,
  });

  if (error) {
    if (error.message.includes('already been registered')) {
        console.log('User already exists in Auth.');
    } else {
        console.error('Error creating user:', error);
    }
  } else {
    console.log('User created successfully:', data.user.id);
  }
}

run();
