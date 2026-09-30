const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '/app/backend/api/.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  try {
    const { error } = await supabase.from('reservations').update({ status: 'PENDING_CONFIRMATION' }).eq('id', '00000000-0000-0000-0000-000000000000');
    console.log('Update error:', error);
  } catch (e) { console.log(e) }
}
check();
