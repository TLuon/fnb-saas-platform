import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testUpdate() {
  const { data: order } = await supabase.from('orders').select('id').limit(1).single();
  if (!order) return console.log('No order found');
  
  const { error } = await supabase.from('orders').update({ payment_method: 'CASH' }).eq('id', order.id);
  console.log('Update result:', error);
}

testUpdate();
