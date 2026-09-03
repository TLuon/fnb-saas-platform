-- ============================================================
-- rls-test-data.sql
-- Dữ liệu TẠM để kiểm thử RLS cách ly đa-tenant — KHÔNG phải seed
-- chính thức của dự án (seed.sql chỉ có 1 tenant "Cafe And Cake").
-- Chạy trong Supabase SQL Editor bằng quyền admin (SQL Editor luôn
-- bypass RLS vì chạy dưới quyền postgres superuser).
--
-- Mục đích: tạo 1 tenant/branch/floor/table THỨ HAI, sau đó dùng JWT
-- của OWNER tenant THỨ NHẤT (Cafe And Cake) để gọi API — nếu RLS hoạt
-- động đúng, các API PHẢI KHÔNG thấy được dữ liệu tenant thứ hai này.
-- ============================================================

INSERT INTO tenants (id, name, subdomain) VALUES
  ('99999999-9999-9999-9999-999999999999', 'Tenant Test RLS', 'tenant-test-rls');

INSERT INTO branches (id, tenant_id, name, address) VALUES
  ('88888888-8888-8888-8888-888888888888', '99999999-9999-9999-9999-999999999999', 'Chi nhánh Test RLS', 'Địa chỉ test');

INSERT INTO floors (id, branch_id, name, floor_level) VALUES
  ('77777777-7777-7777-7777-777777777777', '88888888-8888-8888-8888-888888888888', 'Tầng Test RLS', 1);

INSERT INTO tables (floor_id, table_code, capacity, pos_x, pos_y) VALUES
  ('77777777-7777-7777-7777-777777777777', 'T01', 2, 0, 0);

-- ============================================================
-- Sau khi test xong, có thể dọn dẹp bằng lệnh sau (tùy chọn, không
-- bắt buộc — dữ liệu này không ảnh hưởng gì tới seed chính thức vì
-- khác tenant_id hoàn toàn):
--
-- DELETE FROM tenants WHERE id = '99999999-9999-9999-9999-999999999999';
-- (CASCADE sẽ tự xóa branches/floors/tables liên quan)
-- ============================================================
