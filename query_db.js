const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'backend/api/.env' });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data, error } = await supabase.from('reservations').select('*');
  console.log('Reservations:', data);
}
run();
