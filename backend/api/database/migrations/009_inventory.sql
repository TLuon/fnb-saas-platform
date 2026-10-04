-- ============================================================
-- Migration: 009_inventory.sql
-- B1 Roadmap: Quản lý Kho & Định lượng (Inventory)
--
-- Nội dung:
-- 1. Tạo bảng `ingredients` (danh mục nguyên vật liệu).
-- 2. Tạo bảng `product_recipes` (công thức định lượng món).
-- 3. Tạo bảng `inventory_transactions` (nhật ký biến động xuất/nhập/điều chỉnh kho).
-- 4. Bật RLS và thiết lập chính sách bảo mật đa-tenant.
-- ============================================================

-- ── 1. BẢNG INGREDIENTS (NGUYÊN VẬT LIỆU) ───────────────────

CREATE TABLE IF NOT EXISTS ingredients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(50),
    unit VARCHAR(50) NOT NULL,
    current_stock NUMERIC(15,3) NOT NULL DEFAULT 0.000,
    min_stock_alert NUMERIC(15,3) DEFAULT 0.000,
    cost_per_unit NUMERIC(15,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ingredients_tenant ON ingredients(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ingredients_tenant_sku ON ingredients(tenant_id, sku) WHERE sku IS NOT NULL;

-- ── 2. BẢNG PRODUCT_RECIPES (CÔNG THỨC ĐỊNH LƯỢNG) ─────────

CREATE TABLE IF NOT EXISTS product_recipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
    amount NUMERIC(15,3) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_product_ingredient UNIQUE (product_id, ingredient_id)
);

CREATE INDEX IF NOT EXISTS idx_recipes_product ON product_recipes(product_id);
CREATE INDEX IF NOT EXISTS idx_recipes_ingredient ON product_recipes(ingredient_id);

-- ── 3. BẢNG INVENTORY_TRANSACTIONS (LỊCH SỬ XUẤT NHẬP KHO) ───

CREATE TABLE IF NOT EXISTS inventory_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('IMPORT', 'EXPORT', 'ADJUSTMENT', 'ORDER_CONSUMPTION')),
    quantity NUMERIC(15,3) NOT NULL,
    balance_after NUMERIC(15,3) NOT NULL,
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_inv_tx_tenant_ingredient ON inventory_transactions(tenant_id, ingredient_id);

-- ── 4. RLS VÀ PHÂN QUYỀN CHO INVENTORY ──────────────────────

ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;

-- Restrictive tenant boundary
CREATE POLICY tenant_boundary ON ingredients AS RESTRICTIVE FOR ALL
  USING (tenant_id = app_auth.tenant_id())
  WITH CHECK (tenant_id = app_auth.tenant_id());

CREATE POLICY tenant_boundary ON product_recipes AS RESTRICTIVE FOR ALL
  USING (tenant_id = app_auth.tenant_id())
  WITH CHECK (tenant_id = app_auth.tenant_id());

CREATE POLICY tenant_boundary ON inventory_transactions AS RESTRICTIVE FOR ALL
  USING (tenant_id = app_auth.tenant_id())
  WITH CHECK (tenant_id = app_auth.tenant_id());

-- Permissive policies
CREATE POLICY staff_ingredients_read ON ingredients
  FOR SELECT TO authenticated
  USING (app_auth.role_app() IN ('OWNER', 'MANAGER', 'STAFF'));

CREATE POLICY owner_ingredients_write ON ingredients
  FOR ALL TO authenticated
  USING (app_auth.role_app() IN ('OWNER', 'MANAGER'))
  WITH CHECK (app_auth.role_app() IN ('OWNER', 'MANAGER'));

CREATE POLICY staff_recipes_read ON product_recipes
  FOR SELECT TO authenticated
  USING (app_auth.role_app() IN ('OWNER', 'MANAGER', 'STAFF'));

CREATE POLICY owner_recipes_write ON product_recipes
  FOR ALL TO authenticated
  USING (app_auth.role_app() IN ('OWNER', 'MANAGER'))
  WITH CHECK (app_auth.role_app() IN ('OWNER', 'MANAGER'));

CREATE POLICY staff_inv_tx_read ON inventory_transactions
  FOR SELECT TO authenticated
  USING (app_auth.role_app() IN ('OWNER', 'MANAGER', 'STAFF'));

CREATE POLICY staff_inv_tx_insert ON inventory_transactions
  FOR INSERT TO authenticated
  WITH CHECK (app_auth.role_app() IN ('OWNER', 'MANAGER', 'STAFF'));
