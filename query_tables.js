const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'backend/api/.env' });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data, error } = await supabase.from('tables').select('id, table_code, status').in('table_code', ['B01', 'B02', 'B03', 'B04', 'B05', 'B06']);
  console.log('Tables:', data);
}
run();
