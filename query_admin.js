const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'backend/api/.env' });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const table_id = '783bef6f-1a5e-46b9-a452-3f4e4fd0da39';
  const tenant_id = '11111111-1111-1111-1111-111111111111';
  let q = supabase.from('reservations').select('*').eq('tenant_id', tenant_id).eq('table_id', table_id);
  const { data, error } = await q.order('reservation_time', { ascending: false });
  console.log('Result:', data);
}
run();
