-- ============================================================
-- Migration: 010_b1_fixes.sql
-- Mục đích: B1 Roadmap Fixes (3 nhóm fix cốt lõi)
-- 1. FIX fn_create_order: Hỗ trợ DINE_IN, TAKEAWAY, DELIVERY & shift_id, khóa bàn an toàn
-- 2. FIX inventory: Thêm order_id, partial index & hàm atomic fn_consume_inventory_for_order
-- 3. FIX RLS: Chuẩn hóa quyền OWNER và STAFF, loại bỏ hoàn toàn role MANAGER
-- ============================================================

BEGIN;


-- ============================================================
-- PHẦN 1: FIX fn_create_order (Hỗ trợ DINE_IN, TAKEAWAY, DELIVERY & shift_id)
-- ============================================================

DROP FUNCTION IF EXISTS public.fn_create_order(
  uuid,
  uuid,
  uuid,
  varchar,
  varchar
);

CREATE OR REPLACE FUNCTION fn_create_order(
  p_tenant_id        UUID,
  p_branch_id        UUID,
  p_table_id         UUID DEFAULT NULL,
  p_order_code       VARCHAR DEFAULT NULL,
  p_reservation_code VARCHAR DEFAULT NULL,
  p_order_type       VARCHAR DEFAULT 'DINE_IN',
  p_shift_id         UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_table          tables%ROWTYPE;
  v_payment_tx     payment_transactions%ROWTYPE;
  v_deposit_amount NUMERIC(15,2) := 0.00;
  v_order_id       UUID;
  v_order_code     VARCHAR(50);
  v_order_type     VARCHAR(20);
  v_shift_id       UUID;
BEGIN
  -- 1. Chuẩn hóa và validate order_type (chỉ chấp nhận DINE_IN, TAKEAWAY, DELIVERY)
  v_order_type := UPPER(TRIM(COALESCE(p_order_type, 'DINE_IN')));

  IF v_order_type NOT IN ('DINE_IN', 'TAKEAWAY', 'DELIVERY') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'ERR_9001_VALIDATION_FAILED',
      'message', 'order_type không hợp lệ (chỉ chấp nhận DINE_IN, TAKEAWAY, DELIVERY)'
    );
  END IF;

  -- 2. Kiểm tra bàn đối với đơn DINE_IN
  IF v_order_type = 'DINE_IN' THEN
    IF p_table_id IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error_code', 'ERR_9001_VALIDATION_FAILED',
        'message', 'Đơn dùng tại quán (DINE_IN) bắt buộc phải có table_id'
      );
    END IF;

    -- Khóa dòng bàn FOR UPDATE, xác thực đúng chi nhánh và tenant
    SELECT t.* INTO v_table
    FROM tables t
    JOIN floors f ON f.id = t.floor_id
    JOIN branches b ON b.id = f.branch_id
    WHERE t.id = p_table_id
      AND b.id = p_branch_id
      AND b.tenant_id = p_tenant_id
    FOR UPDATE OF t;

    IF NOT FOUND THEN
      RETURN jsonb_build_object(
        'success', false,
        'error_code', 'ERR_2001_TABLE_NOT_FOUND',
        'message', 'Bàn không tồn tại trong chi nhánh/tenant'
      );
    END IF;

    IF v_table.status IN ('OCCUPIED', 'CLEANING') THEN
      RETURN jsonb_build_object(
        'success', false,
        'error_code', 'ERR_2002_TABLE_LOCKED',
        'message', 'Bàn đang không khả dụng để mở order'
      );
    END IF;
  END IF;

  -- 3. Kiểm tra và khóa tiền cọc với FOR UPDATE (chống double-credit tuyệt đối)
  IF p_reservation_code IS NOT NULL AND TRIM(p_reservation_code) <> '' THEN
    SELECT * INTO v_payment_tx
    FROM payment_transactions
    WHERE tenant_id = p_tenant_id
      AND reservation_code = p_reservation_code
      AND status = 'COMPLETED'
    FOR UPDATE;

    IF NOT FOUND THEN
      RETURN jsonb_build_object(
        'success', false,
        'error_code', 'ERR_3002_PAYMENT_CONTENT_MISMATCH',
        'message', 'Không tìm thấy tiền cọc hợp lệ cho mã đặt bàn này'
      );
    END IF;

    IF v_payment_tx.order_id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error_code', 'ERR_4002_ORDER_ALREADY_COMPLETED',
        'message', 'Tiền cọc đặt bàn này đã được khấu trừ cho một đơn hàng khác'
      );
    END IF;

    v_deposit_amount := COALESCE(v_payment_tx.amount, 0.00);
  END IF;

  -- 4. Xác định mã đơn hàng
  v_order_code := COALESCE(
    NULLIF(TRIM(p_order_code), ''),
    'ORD-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', ''), 1, 8))
  );

  -- 5. Xác thực hoặc xác định ca làm việc (shift_id)
  IF p_shift_id IS NOT NULL THEN
    SELECT s.id INTO v_shift_id
    FROM shifts s
    WHERE s.id = p_shift_id
      AND s.tenant_id = p_tenant_id
      AND s.branch_id = p_branch_id
      AND s.status = 'OPEN'
    FOR UPDATE;

    IF NOT FOUND THEN
      RETURN jsonb_build_object(
        'success', false,
        'error_code', 'ERR_9001_VALIDATION_FAILED',
        'message', 'Ca làm việc (shift_id) không tồn tại, không thuộc chi nhánh hoặc đã đóng'
      );
    END IF;
  ELSE
    -- Tự động tra cứu ca đang mở (OPEN) gần nhất của đúng chi nhánh và tenant
    SELECT s.id INTO v_shift_id
    FROM shifts s
    WHERE s.tenant_id = p_tenant_id
      AND s.branch_id = p_branch_id
      AND s.status = 'OPEN'
    ORDER BY s.opened_at DESC
    LIMIT 1
    FOR UPDATE;
    -- Nếu không có ca nào đang mở, cho phép shift_id là NULL theo contract tạo order
  END IF;

  -- 6. Tạo đơn hàng (insert đúng order_type và shift_id, không hardcode DINE_IN)
  INSERT INTO orders (
    tenant_id,
    branch_id,
    table_id,
    order_code,
    order_type,
    shift_id,
    status,
    discount_amount,
    subtotal,
    final_amount
  )
  VALUES (
    p_tenant_id,
    p_branch_id,
    CASE
      WHEN v_order_type = 'DINE_IN' THEN p_table_id
      ELSE NULL
    END,
    v_order_code,
    v_order_type,
    v_shift_id,
    'PENDING',
    v_deposit_amount,
    0.00,
    0.00
  )
  RETURNING id INTO v_order_id;

  -- 7. Liên kết order_id vào giao dịch tiền cọc ngay lập tức
  IF v_payment_tx.id IS NOT NULL THEN
    UPDATE payment_transactions
    SET order_id = v_order_id
    WHERE id = v_payment_tx.id;
  END IF;

  -- 8. Cập nhật trạng thái bàn sang OCCUPIED (chỉ dành cho DINE_IN)
  IF v_order_type = 'DINE_IN' AND p_table_id IS NOT NULL THEN
    UPDATE tables
    SET status = 'OCCUPIED',
        current_order_id = v_order_id,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_table_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'order_code', v_order_code,
    'order_type', v_order_type,
    'deposit_applied', v_deposit_amount
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error_code', 'ERR_9002_INTERNAL_SERVER_ERROR',
    'message', SQLERRM
  );
END;
$$;


-- ============================================================
-- PHẦN 2: FIX INVENTORY ATOMIC DEDUCTION & IDEMPOTENCY
-- ============================================================

-- 2.1. Bổ sung cột order_id vào inventory_transactions
ALTER TABLE inventory_transactions
  ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id) ON DELETE SET NULL;

-- 2.2. Tạo index cho order_id
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_order_id
  ON inventory_transactions(order_id);

-- 2.3. Tạo partial unique index bảo đảm tính Idempotent cho đơn hàng
CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_transactions_order_ingredient
  ON inventory_transactions (order_id, ingredient_id)
  WHERE (type = 'ORDER_CONSUMPTION' AND order_id IS NOT NULL);

-- 2.4. Hàm atomic RPC fn_consume_inventory_for_order
CREATE OR REPLACE FUNCTION fn_consume_inventory_for_order(
  p_tenant_id UUID,
  p_branch_id UUID,
  p_order_id  UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order          orders%ROWTYPE;
  v_consumed_items JSONB := '[]'::jsonb;
  v_item           RECORD;
  v_insufficient   RECORD;
  v_new_stock      NUMERIC(15,3);
  v_has_recipes    BOOLEAN;
BEGIN
  -- 1. Khóa dòng đơn hàng FOR UPDATE trước (chống race-condition khi trừ kho đồng thời)
  SELECT * INTO v_order
  FROM orders
  WHERE id = p_order_id
    AND tenant_id = p_tenant_id
    AND branch_id = p_branch_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'ERR_4001_ORDER_NOT_FOUND',
      'message', 'Đơn hàng không tồn tại trong chi nhánh/tenant'
    );
  END IF;

  -- 2. Đơn hàng phải có trạng thái COMPLETED
  IF v_order.status <> 'COMPLETED' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'ERR_9001_VALIDATION_FAILED',
      'message', 'Chỉ có thể trừ kho cho đơn hàng đã hoàn tất (COMPLETED)'
    );
  END IF;

  -- 3. Sau khi khóa order, kiểm tra xem đơn hàng đã được trừ kho trước đó chưa (Idempotency)
  IF EXISTS (
    SELECT 1 FROM inventory_transactions
    WHERE tenant_id = p_tenant_id
      AND branch_id = p_branch_id
      AND order_id = p_order_id
      AND type = 'ORDER_CONSUMPTION'
  ) THEN
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'ingredient_id', i.id,
          'ingredient_name', i.name,
          'current_stock', i.current_stock,
          'min_stock_alert', COALESCE(i.min_stock_alert, 0),
          'branch_id', it.branch_id
        )
      ),
      '[]'::jsonb
    ) INTO v_consumed_items
    FROM inventory_transactions it
    JOIN ingredients i ON i.id = it.ingredient_id
    WHERE it.tenant_id = p_tenant_id
      AND it.order_id = p_order_id
      AND it.type = 'ORDER_CONSUMPTION';

    RETURN jsonb_build_object(
      'success', true,
      'message', 'Đơn hàng đã được trừ kho trước đó (idempotent)',
      'consumed_items', v_consumed_items
    );
  END IF;

  -- 4. Kiểm tra xem đơn hàng có món nào gắn công thức định lượng (recipe) không
  SELECT EXISTS (
    SELECT 1
    FROM order_items oi
    JOIN product_recipes pr ON pr.product_id = oi.product_id AND pr.tenant_id = p_tenant_id
    WHERE oi.order_id = p_order_id
  ) INTO v_has_recipes;

  IF NOT v_has_recipes THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Đơn hàng không chứa sản phẩm có công thức định lượng',
      'consumed_items', '[]'::jsonb
    );
  END IF;

  -- 5. Khóa toàn bộ các dòng ingredients cần trừ theo thứ tự id tăng dần để chống deadlock
  PERFORM i.id
  FROM ingredients i
  WHERE i.tenant_id = p_tenant_id
    AND i.id IN (
      SELECT pr.ingredient_id
      FROM order_items oi
      JOIN product_recipes pr ON pr.product_id = oi.product_id AND pr.tenant_id = p_tenant_id
      WHERE oi.order_id = p_order_id
    )
  ORDER BY i.id
  FOR UPDATE;

  -- 6. Kiểm tra tính toàn vẹn: toàn bộ ingredient_id trong recipe phải tồn tại trong bảng ingredients
  IF (
    SELECT COUNT(DISTINCT pr.ingredient_id)
    FROM order_items oi
    JOIN product_recipes pr ON pr.product_id = oi.product_id AND pr.tenant_id = p_tenant_id
    WHERE oi.order_id = p_order_id
  ) <> (
    SELECT COUNT(DISTINCT i.id)
    FROM ingredients i
    WHERE i.tenant_id = p_tenant_id
      AND i.id IN (
        SELECT pr.ingredient_id
        FROM order_items oi
        JOIN product_recipes pr ON pr.product_id = oi.product_id AND pr.tenant_id = p_tenant_id
        WHERE oi.order_id = p_order_id
      )
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'ERR_9001_VALIDATION_FAILED',
      'message', 'Một số nguyên liệu trong công thức không tồn tại trong kho của tenant'
    );
  END IF;

  -- 7. ALL-OR-NOTHING PRE-CHECK: Kiểm tra toàn bộ tồn kho TRƯỚC KHI update bất kỳ nguyên liệu nào
  WITH needed AS (
    SELECT
      pr.ingredient_id,
      SUM(pr.amount * oi.quantity)::NUMERIC(15,3) AS total_needed
    FROM order_items oi
    JOIN product_recipes pr ON pr.product_id = oi.product_id AND pr.tenant_id = p_tenant_id
    WHERE oi.order_id = p_order_id
    GROUP BY pr.ingredient_id
  )
  SELECT
    i.id,
    i.name,
    i.current_stock,
    n.total_needed
  INTO v_insufficient
  FROM ingredients i
  JOIN needed n ON n.ingredient_id = i.id
  WHERE i.tenant_id = p_tenant_id
    AND i.current_stock < n.total_needed
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'ERR_9001_VALIDATION_FAILED',
      'message', 'Tồn kho không đủ để đáp ứng đơn hàng'
    );
  END IF;

  -- 8. Trừ stock và ghi nhật ký inventory_transactions cho từng nguyên liệu
  FOR v_item IN
    WITH needed AS (
      SELECT
        pr.ingredient_id,
        SUM(pr.amount * oi.quantity)::NUMERIC(15,3) AS total_needed
      FROM order_items oi
      JOIN product_recipes pr ON pr.product_id = oi.product_id AND pr.tenant_id = p_tenant_id
      WHERE oi.order_id = p_order_id
      GROUP BY pr.ingredient_id
    )
    SELECT
      i.id,
      i.name,
      i.current_stock,
      i.min_stock_alert,
      n.total_needed
    FROM ingredients i
    JOIN needed n ON n.ingredient_id = i.id
    WHERE i.tenant_id = p_tenant_id
    ORDER BY i.id
  LOOP
    -- Cập nhật stock
    UPDATE ingredients
    SET current_stock = current_stock - v_item.total_needed,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_item.id
    RETURNING current_stock INTO v_new_stock;

    -- Ghi nhật ký ORDER_CONSUMPTION
    INSERT INTO inventory_transactions (
      tenant_id,
      branch_id,
      ingredient_id,
      order_id,
      type,
      quantity,
      balance_after,
      notes,
      created_at
    )
    VALUES (
      p_tenant_id,
      p_branch_id,
      v_item.id,
      p_order_id,
      'ORDER_CONSUMPTION',
      v_item.total_needed,
      v_new_stock,
      'Trừ kho tự động cho đơn hàng ' || COALESCE(v_order.order_code, p_order_id::text),
      CURRENT_TIMESTAMP
    );

    -- Thu thập dữ liệu trả về cho frontend/gateway
    v_consumed_items := v_consumed_items || jsonb_build_object(
      'ingredient_id', v_item.id,
      'ingredient_name', v_item.name,
      'current_stock', v_new_stock,
      'min_stock_alert', COALESCE(v_item.min_stock_alert, 0),
      'branch_id', p_branch_id
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Trừ kho tự động thành công',
    'consumed_items', v_consumed_items
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error_code', 'ERR_9002_INTERNAL_SERVER_ERROR',
    'message', SQLERRM
  );
END;
$$;


-- ============================================================
-- PHẦN 3: FIX RLS ROLES (CHUẨN HÓA OWNER & STAFF, LOẠI BỎ MANAGER)
-- ============================================================

-- 3.1. Bảng shifts
DROP POLICY IF EXISTS staff_shifts_read ON shifts;
DROP POLICY IF EXISTS staff_shifts_insert ON shifts;
DROP POLICY IF EXISTS staff_shifts_update ON shifts;

CREATE POLICY staff_shifts_read ON shifts
  FOR SELECT TO authenticated
  USING (app_auth.role_app() IN ('OWNER', 'STAFF'));

CREATE POLICY staff_shifts_insert ON shifts
  FOR INSERT TO authenticated
  WITH CHECK (app_auth.role_app() IN ('OWNER', 'STAFF'));

CREATE POLICY staff_shifts_update ON shifts
  FOR UPDATE TO authenticated
  USING (app_auth.role_app() IN ('OWNER', 'STAFF'))
  WITH CHECK (app_auth.role_app() IN ('OWNER', 'STAFF'));

-- 3.2. Bảng ingredients
DROP POLICY IF EXISTS staff_ingredients_read ON ingredients;
DROP POLICY IF EXISTS owner_ingredients_write ON ingredients;

CREATE POLICY staff_ingredients_read ON ingredients
  FOR SELECT TO authenticated
  USING (app_auth.role_app() IN ('OWNER', 'STAFF'));

CREATE POLICY owner_ingredients_write ON ingredients
  FOR ALL TO authenticated
  USING (app_auth.role_app() = 'OWNER')
  WITH CHECK (app_auth.role_app() = 'OWNER');

-- 3.3. Bảng product_recipes
DROP POLICY IF EXISTS staff_recipes_read ON product_recipes;
DROP POLICY IF EXISTS owner_recipes_write ON product_recipes;

CREATE POLICY staff_recipes_read ON product_recipes
  FOR SELECT TO authenticated
  USING (app_auth.role_app() IN ('OWNER', 'STAFF'));

CREATE POLICY owner_recipes_write ON product_recipes
  FOR ALL TO authenticated
  USING (app_auth.role_app() = 'OWNER')
  WITH CHECK (app_auth.role_app() = 'OWNER');

-- 3.4. Bảng inventory_transactions
DROP POLICY IF EXISTS staff_inv_tx_read ON inventory_transactions;
DROP POLICY IF EXISTS staff_inv_tx_insert ON inventory_transactions;

CREATE POLICY staff_inv_tx_read ON inventory_transactions
  FOR SELECT TO authenticated
  USING (app_auth.role_app() IN ('OWNER', 'STAFF'));

CREATE POLICY staff_inv_tx_insert ON inventory_transactions
  FOR INSERT TO authenticated
  WITH CHECK (app_auth.role_app() IN ('OWNER', 'STAFF'));


-- ============================================================
-- PHẦN 4: HARDEN SECURITY DEFINER RPC PERMISSIONS
-- Chỉ backend service_role được phép gọi các RPC nhạy cảm
-- ============================================================

REVOKE ALL ON FUNCTION public.fn_create_order(
  uuid,
  uuid,
  uuid,
  varchar,
  varchar,
  varchar,
  uuid
) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.fn_create_order(
  uuid,
  uuid,
  uuid,
  varchar,
  varchar,
  varchar,
  uuid
) FROM anon;

REVOKE ALL ON FUNCTION public.fn_create_order(
  uuid,
  uuid,
  uuid,
  varchar,
  varchar,
  varchar,
  uuid
) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.fn_create_order(
  uuid,
  uuid,
  uuid,
  varchar,
  varchar,
  varchar,
  uuid
) TO service_role;


REVOKE ALL ON FUNCTION public.fn_consume_inventory_for_order(
  uuid,
  uuid,
  uuid
) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.fn_consume_inventory_for_order(
  uuid,
  uuid,
  uuid
) FROM anon;

REVOKE ALL ON FUNCTION public.fn_consume_inventory_for_order(
  uuid,
  uuid,
  uuid
) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.fn_consume_inventory_for_order(
  uuid,
  uuid,
  uuid
) TO service_role;

COMMIT;

