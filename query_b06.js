const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'backend/api/.env' });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data, error } = await supabase.from('tables').select('id, table_code, floor_id, status').eq('table_code', 'B06');
  console.log('Tables B06:', data);
}
run();
