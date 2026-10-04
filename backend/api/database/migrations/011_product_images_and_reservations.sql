-- ============================================================
-- Migration: 011_product_images_and_reservations.sql
-- Mục đích:
-- 1. Thêm cột image_url TEXT cho bảng products
-- 2. Tạo bảng reservations lưu thông tin đặt bàn & cọc tiền
-- 3. Cấu hình RLS và Indexes cho bảng reservations
-- ============================================================

BEGIN;

-- ============================================================
-- PHẦN 1: BẢNG PRODUCTS (Cột image_url)
-- ============================================================

ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;

-- ============================================================
-- PHẦN 2: BẢNG RESERVATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    table_id UUID NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    customer_name VARCHAR(150),
    customer_phone VARCHAR(20),
    reservation_code VARCHAR(50) UNIQUE NOT NULL,
    reservation_time TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deposit_amount NUMERIC(15,2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'CHECKED_IN', 'CANCELLED', 'EXPIRED')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reservations_tenant ON reservations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_reservations_table ON reservations(table_id);
CREATE INDEX IF NOT EXISTS idx_reservations_code ON reservations(reservation_code);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);

-- ============================================================
-- PHẦN 3: ROW LEVEL SECURITY CHO RESERVATIONS
-- ============================================================

ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- 1. Tenant boundary policy (RESTRICTIVE)
DROP POLICY IF EXISTS tenant_boundary ON reservations;
CREATE POLICY tenant_boundary ON reservations AS RESTRICTIVE FOR ALL
  USING (tenant_id = app_auth.tenant_id())
  WITH CHECK (tenant_id = app_auth.tenant_id());

-- 2. Select policy (PERMISSIVE)
-- OWNER, STAFF, SUPPORT xem được mọi đơn đặt bàn của tenant
-- CUSTOMER chỉ xem được đơn đặt bàn của chính mình
DROP POLICY IF EXISTS reservation_read ON reservations;
CREATE POLICY reservation_read ON reservations FOR SELECT
  USING (
    app_auth.role_app() IN ('OWNER', 'STAFF', 'SUPPORT')
    OR customer_id = (SELECT id FROM customers WHERE auth_user_id = auth.uid())
  );

-- 3. Insert policy (PERMISSIVE)
DROP POLICY IF EXISTS reservation_insert ON reservations;
CREATE POLICY reservation_insert ON reservations FOR INSERT
  WITH CHECK (app_auth.role_app() IN ('OWNER', 'STAFF', 'CUSTOMER'));

-- 4. Update policy (PERMISSIVE)
DROP POLICY IF EXISTS reservation_update ON reservations;
CREATE POLICY reservation_update ON reservations FOR UPDATE
  USING (
    app_auth.role_app() IN ('OWNER', 'STAFF')
    OR (app_auth.role_app() = 'CUSTOMER' AND customer_id = (SELECT id FROM customers WHERE auth_user_id = auth.uid()))
  )
  WITH CHECK (app_auth.role_app() IN ('OWNER', 'STAFF', 'CUSTOMER'));

COMMIT;
