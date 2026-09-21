-- ============================================================
-- Migration: 008_shifts_and_takeaway.sql
-- B1 Roadmap: Quản lý Ca làm việc (Shift) & Đơn mang đi / Giao hàng (Takeaway / Delivery)
--
-- Nội dung:
-- 1. Tạo bảng `shifts` quản lý ca làm việc, đối soát tiền mặt đầu/cuối ca.
-- 2. Thêm cột `shift_id` vào bảng `orders` để liên kết đơn với ca.
-- 3. Mở rộng `order_type` hỗ trợ 'DELIVERY' và bổ sung thông tin giao nhận.
-- 4. Bật RLS và thiết lập policy cho bảng `shifts`.
-- ============================================================

-- ── 1. BẢNG SHIFTS (CA LÀM VIỆC) ────────────────────────────

CREATE TABLE IF NOT EXISTS shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    opened_by UUID REFERENCES users(id) ON DELETE SET NULL,
    closed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    opened_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMPTZ,
    starting_cash NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    ending_cash NUMERIC(15,2),
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_shifts_tenant_branch ON shifts(tenant_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_shifts_status ON shifts(status);

-- ── 2. ĐỒNG BỘ GAP 2: LIÊN KẾT ORDERS VỚI SHIFTS & DELIVERY ──

-- Thêm shift_id vào orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shift_id UUID REFERENCES shifts(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_orders_shift ON orders(shift_id);

-- Cập nhật ràng buộc order_type hỗ trợ DELIVERY
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_order_type_check;
ALTER TABLE orders ADD CONSTRAINT orders_order_type_check CHECK (order_type IN ('DINE_IN', 'TAKEAWAY', 'DELIVERY'));

-- Bổ sung thông tin giao hàng / khách vãng lai
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_contact VARCHAR(100);

-- ── 3. RLS CHO BẢNG SHIFTS ───────────────────────────────────

ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

-- Restrictive tenant boundary (bắt buộc mọi truy vấn phải thuộc đúng tenant)
CREATE POLICY tenant_boundary ON shifts AS RESTRICTIVE FOR ALL
  USING (tenant_id = app_auth.tenant_id())
  WITH CHECK (tenant_id = app_auth.tenant_id());

-- Permissive policies cho nhân viên và chủ quán
CREATE POLICY staff_shifts_read ON shifts
  FOR SELECT TO authenticated
  USING (app_auth.role_app() IN ('OWNER', 'MANAGER', 'STAFF'));

CREATE POLICY staff_shifts_insert ON shifts
  FOR INSERT TO authenticated
  WITH CHECK (app_auth.role_app() IN ('OWNER', 'MANAGER', 'STAFF'));

CREATE POLICY staff_shifts_update ON shifts
  FOR UPDATE TO authenticated
  USING (app_auth.role_app() IN ('OWNER', 'MANAGER', 'STAFF'))
  WITH CHECK (app_auth.role_app() IN ('OWNER', 'MANAGER', 'STAFF'));
