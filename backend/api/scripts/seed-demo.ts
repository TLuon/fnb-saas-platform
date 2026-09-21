/**
 * backend/api/scripts/seed-demo.ts
 *
 * Script khởi tạo dữ liệu mẫu (Seed Demo) cho Backend B2 theo roadmap B2.
 * Idempotent: chạy nhiều lần an toàn không trùng lặp dữ liệu.
 *
 * Chạy độc lập:
 *   npx tsx scripts/seed-demo.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const DEMO_PASSWORD = process.env.DEMO_SEED_PASSWORD || 'DemoSecurePass2026!';

export async function seedDemo() {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('[SEED-DEMO] SUPABASE_SERVICE_ROLE_KEY is not defined. Skipping DB seed execution.');
    return { success: false, message: 'Missing SUPABASE_SERVICE_ROLE_KEY' };
  }

  console.log('[SEED-DEMO] Connecting to Supabase at:', SUPABASE_URL);
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const TENANT_ID = '11111111-1111-1111-1111-111111111111';
  const BRANCH_ID = '22222222-2222-2222-2222-222222222222';
  const FLOOR_ID = '33333333-3333-3333-3333-333333333333';
  const BAR_CAT_ID = '44444444-4444-4444-4444-444444444444';
  const KITCHEN_CAT_ID = '55555555-5555-5555-5555-555555555555';

  // 1. Upsert Tenant
  console.log('[SEED-DEMO] Upserting Tenant & Branch...');
  await supabase.from('tenants').upsert(
    {
      id: TENANT_ID,
      name: 'Cafe And Cake',
      subdomain: 'cafe-and-cake',
    },
    { onConflict: 'id' }
  );

  // 2. Upsert Branch
  await supabase.from('branches').upsert(
    {
      id: BRANCH_ID,
      tenant_id: TENANT_ID,
      name: 'Chi nhánh Quận 7',
      address: '123 Nguyễn Văn Linh, Q7, TP.HCM',
    },
    { onConflict: 'id' }
  );

  // 3. Upsert Floor & Tables
  console.log('[SEED-DEMO] Upserting Floor & Tables...');
  await supabase.from('floors').upsert(
    {
      id: FLOOR_ID,
      branch_id: BRANCH_ID,
      name: 'Tầng trệt',
      floor_level: 1,
    },
    { onConflict: 'id' }
  );

  const tables = [
    { id: 'bbbbbbbb-0001-0000-0000-000000000001', floor_id: FLOOR_ID, table_code: 'B01', capacity: 2, pos_x: 50, pos_y: 50, status: 'AVAILABLE' },
    { id: 'bbbbbbbb-0002-0000-0000-000000000002', floor_id: FLOOR_ID, table_code: 'B02', capacity: 2, pos_x: 180, pos_y: 50, status: 'AVAILABLE' },
    { id: 'bbbbbbbb-0003-0000-0000-000000000003', floor_id: FLOOR_ID, table_code: 'B03', capacity: 4, pos_x: 310, pos_y: 50, status: 'AVAILABLE' },
    { id: 'bbbbbbbb-0004-0000-0000-000000000004', floor_id: FLOOR_ID, table_code: 'B04', capacity: 4, pos_x: 50, pos_y: 180, status: 'AVAILABLE' },
    { id: 'bbbbbbbb-0005-0000-0000-000000000005', floor_id: FLOOR_ID, table_code: 'B05', capacity: 6, pos_x: 180, pos_y: 180, status: 'AVAILABLE' },
    { id: 'bbbbbbbb-0006-0000-0000-000000000006', floor_id: FLOOR_ID, table_code: 'B06', capacity: 2, pos_x: 310, pos_y: 180, status: 'AVAILABLE' },
    { id: 'bbbbbbbb-0007-0000-0000-000000000007', floor_id: FLOOR_ID, table_code: 'B07', capacity: 4, pos_x: 50, pos_y: 310, status: 'AVAILABLE' },
    { id: 'bbbbbbbb-0008-0000-0000-000000000008', floor_id: FLOOR_ID, table_code: 'B08', capacity: 4, pos_x: 180, pos_y: 310, status: 'AVAILABLE' },
  ];
  await supabase.from('tables').upsert(tables, { onConflict: 'id' });

  // 4. Upsert Categories & Products
  console.log('[SEED-DEMO] Upserting Menu Categories & Products...');
  await supabase.from('categories').upsert(
    [
      { id: BAR_CAT_ID, tenant_id: TENANT_ID, name: 'Đồ uống', kitchen_station: 'BAR' },
      { id: KITCHEN_CAT_ID, tenant_id: TENANT_ID, name: 'Đồ ăn', kitchen_station: 'KITCHEN' },
    ],
    { onConflict: 'id' }
  );

  const products = [
    { id: 'pppppppp-0001-0000-0000-000000000001', tenant_id: TENANT_ID, category_id: BAR_CAT_ID, name: 'Cà phê sữa đá', price: 29000, is_active: true },
    { id: 'pppppppp-0002-0000-0000-000000000002', tenant_id: TENANT_ID, category_id: BAR_CAT_ID, name: 'Trà đào cam sả', price: 39000, is_active: true },
    { id: 'pppppppp-0003-0000-0000-000000000003', tenant_id: TENANT_ID, category_id: BAR_CAT_ID, name: 'Bạc xỉu', price: 32000, is_active: true },
    { id: 'pppppppp-0004-0000-0000-000000000004', tenant_id: TENANT_ID, category_id: BAR_CAT_ID, name: 'Matcha đá xay', price: 45000, is_active: true },
    { id: 'pppppppp-0005-0000-0000-000000000005', tenant_id: TENANT_ID, category_id: KITCHEN_CAT_ID, name: 'Bánh mì que pate', price: 25000, is_active: true },
    { id: 'pppppppp-0006-0000-0000-000000000006', tenant_id: TENANT_ID, category_id: KITCHEN_CAT_ID, name: 'Bánh croissant', price: 35000, is_active: true },
    { id: 'pppppppp-0007-0000-0000-000000000007', tenant_id: TENANT_ID, category_id: KITCHEN_CAT_ID, name: 'Sandwich gà nướng', price: 42000, is_active: true },
    { id: 'pppppppp-0008-0000-0000-000000000008', tenant_id: TENANT_ID, category_id: KITCHEN_CAT_ID, name: 'Khoai tây chiên', price: 28000, is_active: true },
  ];
  await supabase.from('products').upsert(products, { onConflict: 'id' });

  // 5. Upsert Coffee Pass Plans
  console.log('[SEED-DEMO] Upserting Coffee Pass Plans...');
  const plans = [
    {
      id: 'cccccccc-0001-0000-0000-000000000001',
      tenant_id: TENANT_ID,
      name: 'Coffee Pass 10 Ly',
      price: 200000,
      valid_days: 30,
      total_redemptions: 10,
    },
    {
      id: 'cccccccc-0002-0000-0000-000000000002',
      tenant_id: TENANT_ID,
      name: 'Coffee Pass 20 Ly',
      price: 360000,
      valid_days: 60,
      total_redemptions: 20,
    },
  ];
  await supabase.from('coffee_pass_plans').upsert(plans, { onConflict: 'id' });

  // 6. Create or find 10 STAFF and 10 CUSTOMER auth profiles
  console.log('[SEED-DEMO] Seeding 10 Staff & 10 Customers...');
  for (let i = 1; i <= 10; i++) {
    const staffEmail = `staff${i}@cafe-and-cake.test`;
    const staffPhone = `09010000${i.toString().padStart(2, '0')}`;
    const staffAuthId = `aaaa1111-0000-0000-0000-${i.toString().padStart(12, '0')}`;

    await supabase.from('users').upsert(
      {
        auth_user_id: staffAuthId,
        tenant_id: TENANT_ID,
        branch_id: BRANCH_ID,
        full_name: `Nhân viên ${i}`,
        role: 'STAFF',
        phone: staffPhone,
        is_active: true,
      },
      { onConflict: 'auth_user_id' }
    );

    const custEmail = `customer${i}@cafe-and-cake.test`;
    const custPhone = `09020000${i.toString().padStart(2, '0')}`;
    const custAuthId = `cccc2222-0000-0000-0000-${i.toString().padStart(12, '0')}`;
    const customerDbId = `dddd3333-0000-0000-0000-${i.toString().padStart(12, '0')}`;

    await supabase.from('customers').upsert(
      {
        id: customerDbId,
        auth_user_id: custAuthId,
        tenant_id: TENANT_ID,
        full_name: `Khách hàng ${i}`,
        phone: custPhone,
        email: custEmail,
      },
      { onConflict: 'id' }
    );

    // Initialize customer wallet
    const walletDbId = `wwww4444-0000-0000-0000-${i.toString().padStart(12, '0')}`;
    await supabase.from('wallets').upsert(
      {
        id: walletDbId,
        customer_id: customerDbId,
        main_balance: 200000,
        promo_balance: 50000,
      },
      { onConflict: 'id' }
    );
  }

  // 7. Seed Sample Orders
  console.log('[SEED-DEMO] Seeding Sample Orders...');
  const sampleOrderId = '00000000-9999-0000-0000-000000000001';
  await supabase.from('orders').upsert(
    {
      id: sampleOrderId,
      tenant_id: TENANT_ID,
      branch_id: BRANCH_ID,
      table_id: tables[0].id,
      order_code: 'ORD-DEMO-001',
      order_type: 'DINE_IN',
      status: 'IN_PROGRESS',
      subtotal: 58000,
      final_amount: 58000,
    },
    { onConflict: 'id' }
  );

  await supabase.from('order_items').upsert(
    [
      {
        id: '11110000-0000-0000-0000-000000000001',
        order_id: sampleOrderId,
        product_id: products[0].id,
        product_name: products[0].name,
        quantity: 2,
        unit_price: 29000,
        modifiers: ['ít đá'],
        kitchen_status: 'QUEUED',
      },
    ],
    { onConflict: 'id' }
  );

  // 8. Seed Sample Unmatched Transaction
  console.log('[SEED-DEMO] Seeding Sample Unmatched Payment...');
  const ptxId = '77777777-0000-0000-0000-000000000001';
  await supabase.from('payment_transactions').upsert(
    {
      id: ptxId,
      tenant_id: TENANT_ID,
      amount: 100000,
      raw_transfer_content: 'NGUYEN VAN A CHUYEN KHOAN DEMO',
      status: 'UNMATCHED',
    },
    { onConflict: 'id' }
  );

  await supabase.from('unmatched_transactions').upsert(
    {
      id: '88888888-0000-0000-0000-000000000001',
      payment_transaction_id: ptxId,
      status: 'PENDING',
    },
    { onConflict: 'id' }
  );

  // 9. Seed Sample CSAT Urgent Ticket
  console.log('[SEED-DEMO] Seeding Sample CSAT Ticket...');
  await supabase.from('support_tickets').upsert(
    {
      id: '99999999-0000-0000-0000-000000000001',
      tenant_id: TENANT_ID,
      order_id: sampleOrderId,
      csat_score: 1,
      complaint_note: 'Khách phàn nàn đồ uống đợi quá lâu',
      priority: 'URGENT',
      status: 'OPEN',
    },
    { onConflict: 'id' }
  );

  console.log('[SEED-DEMO] Finished seeding demo data successfully.');
  return { success: true, message: 'Seed demo data completed successfully' };
}

// Auto-run if executed directly via CLI
if (import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, '/')}`) {
  seedDemo()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[SEED-DEMO] Error during seed:', err);
      process.exit(1);
    });
}
