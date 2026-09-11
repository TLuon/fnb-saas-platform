-- ============================================================
-- Migration: 007_financial_and_security_fixes.sql
-- Mục đích:
-- 1. Khắc phục NEW-001: Hàm fn_subscribe_coffee_pass để mua gói Coffee Pass
--    và trừ tiền ví khách hàng trong cùng 1 transaction nguyên tử (SECURITY DEFINER),
--    tránh lỗi RLS và tránh phân rã giao dịch.
-- 2. Khắc phục NEW-002: Bổ sung kiểm tra cách ly đa tenant nghiêm ngặt trong
--    fn_merge_customer_profiles (chặn merge chéo tenant ở tầng database).
-- 3. Khắc phục NEW-007: Hàm fn_create_order thực hiện tạo đơn hàng, khóa bàn,
--    và khấu trừ tiền cọc đặt bàn nguyên tử với SELECT FOR UPDATE chống double credit.
-- 4. Khắc phục NEW-004 / Webhook Concurrency: Thêm partial unique index cho
--    payment_transactions chống ghi trùng lặp webhook COMPLETED khi gọi đồng thời.
-- ============================================================

-- ── 1. ĐỘC QUYỀN MÃ CỌC ĐẶT BÀN COMPLETED ──────────────────
CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_transactions_res_completed
ON payment_transactions (tenant_id, reservation_code)
WHERE (reservation_code IS NOT NULL AND status = 'COMPLETED');


-- ── 2. HÀM ATOMIC: fn_subscribe_coffee_pass (NEW-001) ───────
CREATE OR REPLACE FUNCTION fn_subscribe_coffee_pass(
  p_auth_user_id UUID,
  p_tenant_id    UUID,
  p_plan_id      UUID,
  p_totp_secret  VARCHAR(64),
  p_expires_at   TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer        customers%ROWTYPE;
  v_plan            coffee_pass_plans%ROWTYPE;
  v_wallet          wallets%ROWTYPE;
  v_amount_to_pay   NUMERIC(15,2);
  v_promo_deducted  NUMERIC(15,2) := 0.00;
  v_main_deducted   NUMERIC(15,2) := 0.00;
  v_new_promo_bal   NUMERIC(15,2);
  v_new_main_bal    NUMERIC(15,2);
  v_remaining       NUMERIC(15,2);
  v_subscription_id UUID;
BEGIN
  -- 1. Xác thực customer thuộc đúng tenant
  SELECT * INTO v_customer
  FROM customers
  WHERE auth_user_id = p_auth_user_id AND tenant_id = p_tenant_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'ERR_1001_UNAUTHORIZED',
      'message', 'Customer không tồn tại trong tenant'
    );
  END IF;

  -- 2. Xác thực plan thuộc đúng tenant
  SELECT * INTO v_plan
  FROM coffee_pass_plans
  WHERE id = p_plan_id AND tenant_id = p_tenant_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'ERR_9001_VALIDATION_FAILED',
      'message', 'Gói Coffee Pass không tồn tại hoặc không thuộc tenant'
    );
  END IF;

  -- 3. Khóa ví dòng với FOR UPDATE chống race condition
  SELECT * INTO v_wallet
  FROM wallets
  WHERE customer_id = v_customer.id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'ERR_3003_INSUFFICIENT_WALLET_BALANCE',
      'message', 'Ví khách hàng không khả dụng'
    );
  END IF;

  -- 4. Kiểm tra số dư ví
  v_amount_to_pay := v_plan.price;
  IF (COALESCE(v_wallet.promo_balance, 0) + COALESCE(v_wallet.main_balance, 0)) < v_amount_to_pay THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'ERR_3003_INSUFFICIENT_WALLET_BALANCE',
      'message', 'Số dư ví không đủ để đăng ký gói Coffee Pass'
    );
  END IF;

  -- 5. Trừ ví: PROMO trước, MAIN sau
  v_remaining := v_amount_to_pay;
  IF v_wallet.promo_balance > 0 THEN
    v_promo_deducted := LEAST(v_wallet.promo_balance, v_remaining);
    v_remaining := v_remaining - v_promo_deducted;
  END IF;

  IF v_remaining > 0 THEN
    v_main_deducted := v_remaining;
  END IF;

  v_new_promo_bal := v_wallet.promo_balance - v_promo_deducted;
  v_new_main_bal  := v_wallet.main_balance  - v_main_deducted;

  -- 6. Cập nhật số dư ví
  UPDATE wallets
  SET promo_balance = v_new_promo_bal,
      main_balance  = v_new_main_bal,
      updated_at    = CURRENT_TIMESTAMP
  WHERE id = v_wallet.id;

  -- 7. Ghi lịch sử giao dịch ví (ledger)
  IF v_promo_deducted > 0 THEN
    INSERT INTO wallet_transactions (wallet_id, order_id, type, balance_type, amount, balance_after)
    VALUES (v_wallet.id, NULL, 'PAYMENT', 'PROMO', -v_promo_deducted, v_new_promo_bal);
  END IF;

  IF v_main_deducted > 0 THEN
    INSERT INTO wallet_transactions (wallet_id, order_id, type, balance_type, amount, balance_after)
    VALUES (v_wallet.id, NULL, 'PAYMENT', 'MAIN', -v_main_deducted, v_new_main_bal);
  END IF;

  -- 8. Tạo subscription Coffee Pass
  INSERT INTO coffee_pass_subscriptions (
    customer_id,
    plan_id,
    remaining_redemptions,
    totp_secret,
    expires_at
  )
  VALUES (
    v_customer.id,
    v_plan.id,
    v_plan.total_redemptions,
    p_totp_secret,
    p_expires_at
  )
  RETURNING id INTO v_subscription_id;

  RETURN jsonb_build_object(
    'success', true,
    'subscription_id', v_subscription_id,
    'remaining_redemptions', v_plan.total_redemptions,
    'expires_at', p_expires_at,
    'amount_paid', v_amount_to_pay,
    'promo_deducted', v_promo_deducted,
    'main_deducted', v_main_deducted,
    'new_main_balance', v_new_main_bal,
    'new_promo_balance', v_new_promo_bal
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error_code', 'ERR_9002_INTERNAL_SERVER_ERROR',
    'message', SQLERRM
  );
END;
$$;


-- ── 3. HÀM ATOMIC: fn_merge_customer_profiles CÁCH LY TENANT (NEW-002) ────
CREATE OR REPLACE FUNCTION fn_merge_customer_profiles(
  target_id UUID,
  source_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_source_wallet_id UUID;
  v_target_wallet_id UUID;
  v_source_main NUMERIC(15,2) := 0.00;
  v_source_promo NUMERIC(15,2) := 0.00;
  v_source_tenant UUID;
  v_target_tenant UUID;
BEGIN
  -- 1. Kiểm tra hai khách hàng khác nhau
  IF target_id = source_id THEN
    RAISE EXCEPTION 'ERR_6004_MERGE_SAME_CUSTOMER: target_id and source_id must be different';
  END IF;

  -- 2. Kiểm tra tồn tại và kiểm tra cách ly đa tenant
  SELECT tenant_id INTO v_target_tenant FROM customers WHERE id = target_id;
  IF v_target_tenant IS NULL THEN
    RAISE EXCEPTION 'ERR_9001_VALIDATION_FAILED: Target customer not found';
  END IF;

  SELECT tenant_id INTO v_source_tenant FROM customers WHERE id = source_id;
  IF v_source_tenant IS NULL THEN
    RAISE EXCEPTION 'ERR_9001_VALIDATION_FAILED: Source customer not found';
  END IF;

  IF v_target_tenant <> v_source_tenant THEN
    RAISE EXCEPTION 'ERR_1003_TENANT_MISMATCH: Cannot merge customer profiles from different tenants';
  END IF;

  -- 3. Đảm bảo ví của target tồn tại (nếu chưa có thì tạo)
  SELECT id INTO v_target_wallet_id FROM wallets WHERE customer_id = target_id;
  IF v_target_wallet_id IS NULL THEN
    INSERT INTO wallets (customer_id, main_balance, promo_balance)
    VALUES (target_id, 0.00, 0.00)
    RETURNING id INTO v_target_wallet_id;
  END IF;

  -- 4. Đọc số dư từ ví của source (nếu có)
  SELECT id, main_balance, promo_balance
  INTO v_source_wallet_id, v_source_main, v_source_promo
  FROM wallets
  WHERE customer_id = source_id;

  IF v_source_wallet_id IS NOT NULL THEN
    -- Chuyển số dư ví nguồn sang ví đích
    IF v_source_main > 0 OR v_source_promo > 0 THEN
      UPDATE wallets
      SET main_balance = main_balance + v_source_main,
          promo_balance = promo_balance + v_source_promo,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = v_target_wallet_id;

      -- Ghi log chuyển giao dịch nếu có số dư
      IF v_source_main > 0 THEN
        INSERT INTO wallet_transactions (wallet_id, type, balance_type, amount, balance_after)
        VALUES (
          v_target_wallet_id,
          'TOPUP',
          'MAIN',
          v_source_main,
          (SELECT main_balance FROM wallets WHERE id = v_target_wallet_id)
        );
      END IF;

      IF v_source_promo > 0 THEN
        INSERT INTO wallet_transactions (wallet_id, type, balance_type, amount, balance_after)
        VALUES (
          v_target_wallet_id,
          'PROMO_CREDIT',
          'PROMO',
          v_source_promo,
          (SELECT promo_balance FROM wallets WHERE id = v_target_wallet_id)
        );
      END IF;
    END IF;

    -- Chuyển toàn bộ lịch sử giao dịch ví của source sang ví target
    UPDATE wallet_transactions
    SET wallet_id = v_target_wallet_id
    WHERE wallet_id = v_source_wallet_id;

    -- Xóa ví của source sau khi đã chuyển toàn bộ số dư và lịch sử
    DELETE FROM wallets WHERE id = v_source_wallet_id;
  END IF;

  -- 5. Chuyển các thực thể liên kết khác từ source sang target
  UPDATE orders SET customer_id = target_id WHERE customer_id = source_id;
  UPDATE loyalty_transactions SET customer_id = target_id WHERE customer_id = source_id;
  UPDATE payment_transactions SET matched_customer_id = target_id WHERE matched_customer_id = source_id;
  UPDATE support_tickets SET customer_id = target_id WHERE customer_id = source_id;
  UPDATE customer_vouchers SET customer_id = target_id WHERE customer_id = source_id;
  UPDATE coffee_pass_subscriptions SET customer_id = target_id WHERE customer_id = source_id;

  -- 6. Hợp nhất chỉ số tổng hợp của customer
  UPDATE customers t SET
    total_spent = t.total_spent + s.total_spent,
    total_visits = t.total_visits + s.total_visits,
    loyalty_points = t.loyalty_points + s.loyalty_points,
    first_visit_at = LEAST(t.first_visit_at, s.first_visit_at),
    last_visit_at = GREATEST(t.last_visit_at, s.last_visit_at),
    email = COALESCE(t.email, s.email),
    dietary_notes = COALESCE(t.dietary_notes, s.dietary_notes)
  FROM customers s
  WHERE s.id = source_id AND t.id = target_id;

  -- 7. Xóa profile khách hàng nguồn
  DELETE FROM customers WHERE id = source_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ── 4. HÀM ATOMIC: fn_create_order_with_deposit (NEW-007) ───
CREATE OR REPLACE FUNCTION fn_create_order(
  p_tenant_id        UUID,
  p_branch_id        UUID,
  p_table_id         UUID,
  p_order_code       VARCHAR(50),
  p_reservation_code VARCHAR(50) DEFAULT NULL
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
BEGIN
  -- 1. Khóa dòng bàn bằng FOR UPDATE chống mở trùng bàn đồng thời
  SELECT * INTO v_table
  FROM tables
  WHERE id = p_table_id AND tenant_id = p_tenant_id
  FOR UPDATE;

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

  -- 2. Kiểm tra và khóa tiền cọc với FOR UPDATE (chống double-credit tuyệt đối)
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

  -- 3. Tạo order
  INSERT INTO orders (
    tenant_id,
    branch_id,
    table_id,
    order_code,
    order_type,
    status,
    discount_amount,
    subtotal,
    final_amount
  )
  VALUES (
    p_tenant_id,
    p_branch_id,
    p_table_id,
    p_order_code,
    'DINE_IN',
    'PENDING',
    v_deposit_amount,
    0.00,
    0.00
  )
  RETURNING id INTO v_order_id;

  -- 4. Liên kết order_id vào tiền cọc ngay lập tức
  IF v_payment_tx.id IS NOT NULL THEN
    UPDATE payment_transactions
    SET order_id = v_order_id
    WHERE id = v_payment_tx.id;
  END IF;

  -- 5. Cập nhật trạng thái bàn sang OCCUPIED
  UPDATE tables
  SET status = 'OCCUPIED',
      current_order_id = v_order_id
  WHERE id = p_table_id;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'order_code', p_order_code,
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
