import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ioekhkpzrpuivzzannvn.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlvZWtoa3B6cnB1aXZ6emFubnZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODc1Nzg5MiwiZXhwIjoyMTA0MzMzODkyfQ.PSQ0StG_pyomaoFafAO9Jvd5kqd2nxu87MvmLBTj454';

const BRANCH_ID = '22222222-2222-2222-2222-222222222222';
const FLOOR1_ID = '33333333-3333-3333-3333-333333333333';
const FLOOR2_ID = '33333333-3333-3333-3333-333333333334';

async function seedFloorsAndDecor() {
  console.log('[SEED-FLOORS-DECOR] Connecting to Supabase...');
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1. Upsert 2 Floors
  console.log('[SEED-FLOORS-DECOR] Upserting 2 Floors...');
  await supabase.from('floors').upsert(
    [
      {
        id: FLOOR1_ID,
        branch_id: BRANCH_ID,
        name: 'Tầng trệt',
        floor_level: 1,
      },
      {
        id: FLOOR2_ID,
        branch_id: BRANCH_ID,
        name: 'Tầng 1 (Lầu 1)',
        floor_level: 2,
      },
    ],
    { onConflict: 'id' }
  );

  // 2. Tables & Decor for Floor 1 (Tầng trệt)
  const floor1Items = [
    // Tables
    { id: 'bbbbbbbb-0001-0000-0000-000000000001', floor_id: FLOOR1_ID, name: 'B01', table_code: 'B01', capacity: 2, pos_x: 60, pos_y: 120, width: 80, height: 80, shape: 'rectangle', status: 'AVAILABLE' },
    { id: 'bbbbbbbb-0002-0000-0000-000000000002', floor_id: FLOOR1_ID, name: 'B02', table_code: 'B02', capacity: 2, pos_x: 180, pos_y: 120, width: 80, height: 80, shape: 'rectangle', status: 'AVAILABLE' },
    { id: 'bbbbbbbb-0003-0000-0000-000000000003', floor_id: FLOOR1_ID, name: 'B03', table_code: 'B03', capacity: 4, pos_x: 300, pos_y: 120, width: 80, height: 80, shape: 'square', status: 'AVAILABLE' },
    { id: 'bbbbbbbb-0004-0000-0000-000000000004', floor_id: FLOOR1_ID, name: 'B04', table_code: 'B04', capacity: 4, pos_x: 60, pos_y: 240, width: 80, height: 80, shape: 'rectangle', status: 'AVAILABLE' },
    { id: 'bbbbbbbb-0005-0000-0000-000000000005', floor_id: FLOOR1_ID, name: 'B05', table_code: 'B05', capacity: 6, pos_x: 180, pos_y: 240, width: 80, height: 80, shape: 'circle', status: 'AVAILABLE' },
    { id: 'bbbbbbbb-0006-0000-0000-000000000006', floor_id: FLOOR1_ID, name: 'B06', table_code: 'B06', capacity: 2, pos_x: 300, pos_y: 240, width: 80, height: 80, shape: 'rectangle', status: 'AVAILABLE' },
    { id: 'bbbbbbbb-0007-0000-0000-000000000007', floor_id: FLOOR1_ID, name: 'B07', table_code: 'B07', capacity: 4, pos_x: 60, pos_y: 360, width: 80, height: 80, shape: 'square', status: 'AVAILABLE' },
    { id: 'bbbbbbbb-0008-0000-0000-000000000008', floor_id: FLOOR1_ID, name: 'B08', table_code: 'B08', capacity: 4, pos_x: 180, pos_y: 360, width: 80, height: 80, shape: 'rectangle', status: 'AVAILABLE' },
    
    // Decor Items on Floor 1
    { id: 'dddddddd-0001-0000-0000-000000000001', floor_id: FLOOR1_ID, name: 'Cửa ra vào sảnh chính', table_code: 'D01', capacity: 0, pos_x: 60, pos_y: 20, width: 140, height: 40, shape: 'door', status: 'AVAILABLE' },
    { id: 'dddddddd-0002-0000-0000-000000000002', floor_id: FLOOR1_ID, name: 'Cầu thang lên Lầu 1', table_code: 'D02', capacity: 0, pos_x: 550, pos_y: 20, width: 120, height: 90, shape: 'stairs', status: 'AVAILABLE' },
    { id: 'dddddddd-0003-0000-0000-000000000003', floor_id: FLOOR1_ID, name: 'Bồn hoa trang trí sảnh', table_code: 'D03', capacity: 0, pos_x: 230, pos_y: 20, width: 160, height: 40, shape: 'plant', status: 'AVAILABLE' },
    { id: 'dddddddd-0004-0000-0000-000000000004', floor_id: FLOOR1_ID, name: 'Cửa sổ View Phố', table_code: 'D04', capacity: 0, pos_x: 410, pos_y: 20, width: 120, height: 35, shape: 'window', status: 'AVAILABLE' },
  ];

  // 3. Tables & Decor for Floor 2 (Tầng 1 / Lầu 1)
  const floor2Items = [
    // Tables
    { id: 'bbbbbbbb-0009-0000-0000-000000000009', floor_id: FLOOR2_ID, name: 'B09', table_code: 'B09', capacity: 2, pos_x: 60, pos_y: 120, width: 80, height: 80, shape: 'rectangle', status: 'AVAILABLE' },
    { id: 'bbbbbbbb-0010-0000-0000-000000000010', floor_id: FLOOR2_ID, name: 'B10', table_code: 'B10', capacity: 2, pos_x: 180, pos_y: 120, width: 80, height: 80, shape: 'rectangle', status: 'AVAILABLE' },
    { id: 'bbbbbbbb-0011-0000-0000-000000000011', floor_id: FLOOR2_ID, name: 'B11', table_code: 'B11', capacity: 4, pos_x: 300, pos_y: 120, width: 80, height: 80, shape: 'circle', status: 'AVAILABLE' },
    { id: 'bbbbbbbb-0012-0000-0000-000000000012', floor_id: FLOOR2_ID, name: 'B12', table_code: 'B12', capacity: 4, pos_x: 420, pos_y: 120, width: 80, height: 80, shape: 'rectangle', status: 'AVAILABLE' },
    { id: 'bbbbbbbb-0013-0000-0000-000000000013', floor_id: FLOOR2_ID, name: 'B13', table_code: 'B13', capacity: 6, pos_x: 60, pos_y: 240, width: 80, height: 80, shape: 'rectangle', status: 'AVAILABLE' },
    { id: 'bbbbbbbb-0014-0000-0000-000000000014', floor_id: FLOOR2_ID, name: 'B14', table_code: 'B14', capacity: 2, pos_x: 180, pos_y: 240, width: 80, height: 80, shape: 'square', status: 'AVAILABLE' },
    { id: 'bbbbbbbb-0015-0000-0000-000000000015', floor_id: FLOOR2_ID, name: 'B15', table_code: 'B15', capacity: 4, pos_x: 300, pos_y: 240, width: 80, height: 80, shape: 'circle', status: 'AVAILABLE' },
    { id: 'bbbbbbbb-0016-0000-0000-000000000016', floor_id: FLOOR2_ID, name: 'B16', table_code: 'B16', capacity: 4, pos_x: 420, pos_y: 240, width: 80, height: 80, shape: 'rectangle', status: 'AVAILABLE' },

    // Decor Items on Floor 2
    { id: 'dddddddd-0005-0000-0000-000000000005', floor_id: FLOOR2_ID, name: 'Cầu thang xuống', table_code: 'D05', capacity: 0, pos_x: 550, pos_y: 20, width: 120, height: 90, shape: 'stairs', status: 'AVAILABLE' },
    { id: 'dddddddd-0006-0000-0000-000000000006', floor_id: FLOOR2_ID, name: 'Ban công View Hoàng Hôn', table_code: 'D06', capacity: 0, pos_x: 60, pos_y: 360, width: 440, height: 50, shape: 'balcony', status: 'AVAILABLE' },
    { id: 'dddddddd-0007-0000-0000-000000000007', floor_id: FLOOR2_ID, name: 'Cửa sổ Toàn Cảnh', table_code: 'D07', capacity: 0, pos_x: 60, pos_y: 20, width: 280, height: 35, shape: 'window', status: 'AVAILABLE' },
    { id: 'dddddddd-0008-0000-0000-000000000008', floor_id: FLOOR2_ID, name: 'Bồn hoa Ban công', table_code: 'D08', capacity: 0, pos_x: 360, pos_y: 20, width: 160, height: 40, shape: 'plant', status: 'AVAILABLE' },
  ];

  console.log('[SEED-FLOORS-DECOR] Upserting tables and decor for Floor 1...');
  await supabase.from('tables').upsert(floor1Items, { onConflict: 'id' });

  console.log('[SEED-FLOORS-DECOR] Upserting tables and decor for Floor 2...');
  await supabase.from('tables').upsert(floor2Items, { onConflict: 'id' });

  console.log('[SEED-FLOORS-DECOR] Multi-Floor & Decor layout successfully seeded!');
}

seedFloorsAndDecor().catch(console.error);
