const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  
  const { data, error } = await supabase
    .from('reservations')
    .update({ status: 'CANCELLED' })
    .in('status', ['PENDING', 'PENDING_LOCK'])
    .lt('created_at', tenMinutesAgo);
    
  if (error) {
    console.error('Error cancelling old reservations:', error);
  } else {
    console.log('Successfully cancelled old pending reservations.');
  }

  // Also free up tables
  const { error: tableErr } = await supabase
    .from('tables')
    .update({ status: 'AVAILABLE' })
    .eq('status', 'PENDING_LOCK');
    
  if (tableErr) {
    console.error('Error freeing tables:', tableErr);
  } else {
    console.log('Successfully freed tables.');
  }
}

run();
