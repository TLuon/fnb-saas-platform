-- ============================================================
-- Migration: 006_rls_and_merge_fixes.sql
-- Mục đích:
-- 1. Khắc phục ISSUE-001: Bổ sung các PERMISSIVE RLS policies còn thiếu
--    cho customer_vouchers, payment_transactions, coffee_pass_subscriptions,
--    wallets và wallet_transactions để các thao tác ghi của user-scoped client
--    không bị Postgres chặn.
-- 2. Khắc phục ISSUE-002: Cập nhật hàm fn_merge_customer_profiles để chuyển
--    toàn bộ số dư ví (main_balance, promo_balance) từ profile nguồn sang
--    profile đích trước khi xóa ví nguồn, đảm bảo tính toàn vẹn tài chính.
-- ============================================================

-- ── 1. BỔ SUNG PERMISSIVE RLS POLICIES (ISSUE-001) ──────────

-- customer_vouchers: Cho phép STAFF, OWNER, SUPPORT quản lý voucher khách hàng
CREATE POLICY staff_voucher_manage ON customer_vouchers
  FOR ALL TO authenticated
  USING (app_auth.role_app() IN ('OWNER', 'MANAGER', 'STAFF', 'SUPPORT'))
  WITH CHECK (app_auth.role_app() IN ('OWNER', 'MANAGER', 'STAFF', 'SUPPORT'));

-- payment_transactions: Cho phép STAFF, OWNER, SUPPORT ghi nhận và cập nhật trạng thái thanh toán
CREATE POLICY staff_payment_insert ON payment_transactions
  FOR INSERT TO authenticated
  WITH CHECK (app_auth.role_app() IN ('OWNER', 'MANAGER', 'STAFF', 'SUPPORT'));

CREATE POLICY staff_payment_update ON payment_transactions
  FOR UPDATE TO authenticated
  USING (app_auth.role_app() IN ('OWNER', 'MANAGER', 'STAFF', 'SUPPORT'))
  WITH CHECK (app_auth.role_app() IN ('OWNER', 'MANAGER', 'STAFF', 'SUPPORT'));

-- coffee_pass_subscriptions: Khách hàng được tạo subscription cho chính mình khi mua gói
CREATE POLICY own_pass_insert ON coffee_pass_subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (
    app_auth.role_app() = 'CUSTOMER'
    AND customer_id = (SELECT id FROM customers WHERE auth_user_id = auth.uid())
  );

CREATE POLICY own_pass_update ON coffee_pass_subscriptions
  FOR UPDATE TO authenticated
  USING (
    app_auth.role_app() = 'CUSTOMER'
    AND customer_id = (SELECT id FROM customers WHERE auth_user_id = auth.uid())
  )
  WITH CHECK (
    app_auth.role_app() = 'CUSTOMER'
    AND customer_id = (SELECT id FROM customers WHERE auth_user_id = auth.uid())
  );

-- coffee_pass_subscriptions: STAFF, OWNER quản lý hoặc quét mã đổi món
CREATE POLICY staff_pass_manage ON coffee_pass_subscriptions
  FOR ALL TO authenticated
  USING (app_auth.role_app() IN ('OWNER', 'MANAGER', 'STAFF'))
  WITH CHECK (app_auth.role_app() IN ('OWNER', 'MANAGER', 'STAFF'));

-- wallets: OWNER, MANAGER, STAFF được quyền đọc thông tin ví để hỗ trợ khách
CREATE POLICY staff_wallet_read ON wallets
  FOR SELECT TO authenticated
  USING (app_auth.role_app() IN ('OWNER', 'MANAGER', 'STAFF', 'SUPPORT'));

-- wallet_transactions: OWNER, MANAGER, STAFF được quyền xem lịch sử giao dịch ví
CREATE POLICY staff_wallet_tx_read ON wallet_transactions
  FOR SELECT TO authenticated
  USING (app_auth.role_app() IN ('OWNER', 'MANAGER', 'STAFF', 'SUPPORT'));


-- ── 2. CẬP NHẬT HÀM fn_merge_customer_profiles (ISSUE-002) ───

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
BEGIN
  -- 1. Kiểm tra hai khách hàng hợp lệ và khác nhau
  IF target_id = source_id THEN
    RAISE EXCEPTION 'target_id and source_id must be different';
  END IF;

  -- 2. Đảm bảo ví của target tồn tại (nếu chưa có thì tạo)
  SELECT id INTO v_target_wallet_id FROM wallets WHERE customer_id = target_id;
  IF v_target_wallet_id IS NULL THEN
    INSERT INTO wallets (customer_id, main_balance, promo_balance)
    VALUES (target_id, 0.00, 0.00)
    RETURNING id INTO v_target_wallet_id;
  END IF;

  -- 3. Đọc số dư từ ví của source (nếu có)
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

  -- 4. Chuyển các thực thể liên kết khác từ source sang target
  UPDATE orders SET customer_id = target_id WHERE customer_id = source_id;
  UPDATE loyalty_transactions SET customer_id = target_id WHERE customer_id = source_id;
  UPDATE payment_transactions SET matched_customer_id = target_id WHERE matched_customer_id = source_id;
  UPDATE support_tickets SET customer_id = target_id WHERE customer_id = source_id;
  UPDATE customer_vouchers SET customer_id = target_id WHERE customer_id = source_id;
  UPDATE coffee_pass_subscriptions SET customer_id = target_id WHERE customer_id = source_id;

  -- 5. Hợp nhất chỉ số tổng hợp của customer
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

  -- 6. Xóa profile khách hàng nguồn
  DELETE FROM customers WHERE id = source_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
