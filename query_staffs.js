const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'backend/api/.env' });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data, error } = await supabase.from('users').select('*').eq('full_name', 'Runtime Staff');
  console.log('Runtime Staffs:', data);
}
run();
