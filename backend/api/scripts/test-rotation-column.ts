import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ioekhkpzrpuivzzannvn.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlvZWtoa3B6cnB1aXZ6emFubnZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODc1Nzg5MiwiZXhwIjoyMTA0MzMzODkyfQ.PSQ0StG_pyomaoFafAO9Jvd5kqd2nxu87MvmLBTj454';

async function run() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  // Try rpc call
  const { data, error } = await supabase.rpc('exec_sql', { sql: 'ALTER TABLE tables ADD COLUMN IF NOT EXISTS rotation INT DEFAULT 0;' });
  console.log('RPC exec_sql result:', { data, error });
}

run();
