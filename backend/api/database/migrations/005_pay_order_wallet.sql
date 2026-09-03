-- ============================================================
-- 005_pay_order_wallet.sql
-- ISSUE 3 FIX: Wallet Payment Atomicity
-- Mục tiêu: wallet debit và order → COMPLETED phải xảy ra
-- trong cùng một DB transaction để tránh inconsistency tài chính.
--
-- Supabase PostgREST không hỗ trợ cross-table transaction qua
-- REST API thông thường. Giải pháp: PostgreSQL function SECURITY
-- DEFINER bọc toàn bộ logic trong 1 transaction.
--
-- Chạy SAU KHI 001, 002, 003, 004 đã chạy thành công.
-- ============================================================

CREATE OR REPLACE FUNCTION fn_pay_order_wallet(
  p_order_id     UUID,
  p_auth_user_id UUID,  -- auth.users.id (sub từ JWT)
  p_tenant_id    UUID   -- tenant_id từ JWT claim (không tin client)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order           orders%ROWTYPE;
  v_customer        customers%ROWTYPE;
  v_wallet          wallets%ROWTYPE;
  v_amount_to_pay   NUMERIC(15,2);
  v_promo_deducted  NUMERIC(15,2) := 0;
  v_main_deducted   NUMERIC(15,2) := 0;
  v_new_promo_bal   NUMERIC(15,2);
  v_new_main_bal    NUMERIC(15,2);
  v_remaining       NUMERIC(15,2);
  v_rows_updated    INT;
BEGIN
  -- ── 1. Load và validate order ──────────────────────────────
  SELECT * INTO v_order
  FROM orders
  WHERE id = p_order_id AND tenant_id = p_tenant_id
  FOR UPDATE;  -- row-level lock để chặn concurrent pay

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'ERR_4001_ORDER_NOT_FOUND',
                              'message', 'Order không tồn tại');
  END IF;

  IF v_order.status IN ('COMPLETED', 'CANCELLED') THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'ERR_4002_ORDER_ALREADY_COMPLETED',
                              'message', 'Order đã thanh toán hoặc đã hủy');
  END IF;

  -- ── 2. Resolve customer tenant-scoped ─────────────────────
  SELECT * INTO v_customer
  FROM customers
  WHERE auth_user_id = p_auth_user_id AND tenant_id = p_tenant_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'ERR_1001_UNAUTHORIZED',
                              'message', 'Customer không tồn tại trong tenant');
  END IF;

  -- ── 3. Load wallet với row-level lock ─────────────────────
  SELECT * INTO v_wallet
  FROM wallets
  WHERE customer_id = v_customer.id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'ERR_3003_INSUFFICIENT_WALLET_BALANCE',
                              'message', 'Ví không khả dụng');
  END IF;

  -- ── 4. Validate balance ────────────────────────────────────
  v_amount_to_pay := COALESCE(v_order.final_amount, v_order.subtotal, 0);

  IF (v_wallet.promo_balance + v_wallet.main_balance) < v_amount_to_pay THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'ERR_3003_INSUFFICIENT_WALLET_BALANCE',
                              'message', 'Số dư ví không đủ');
  END IF;

  -- ── 5. Tính số tiền trừ: PROMO trước, MAIN sau ────────────
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

  -- ── 6. Debit wallet (atomic update với lock đã giữ) ────────
  UPDATE wallets
  SET promo_balance = v_new_promo_bal,
      main_balance  = v_new_main_bal,
      updated_at    = NOW()
  WHERE id = v_wallet.id;

  -- ── 7. Insert wallet_transactions ─────────────────────────
  IF v_promo_deducted > 0 THEN
    INSERT INTO wallet_transactions(wallet_id, order_id, type, balance_type, amount, balance_after)
    VALUES (v_wallet.id, p_order_id, 'PAYMENT', 'PROMO', -v_promo_deducted, v_new_promo_bal);
  END IF;

  IF v_main_deducted > 0 THEN
    INSERT INTO wallet_transactions(wallet_id, order_id, type, balance_type, amount, balance_after)
    VALUES (v_wallet.id, p_order_id, 'PAYMENT', 'MAIN', -v_main_deducted, v_new_main_bal);
  END IF;

  -- ── 8. Update order → COMPLETED (trong cùng transaction) ──
  UPDATE orders
  SET status = 'COMPLETED', payment_method = 'WALLET'
  WHERE id = p_order_id;

  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
  IF v_rows_updated = 0 THEN
    -- Không nên xảy ra vì đã lock row ở bước 1, nhưng để an toàn
    RAISE EXCEPTION 'Failed to update order status — order_id: %', p_order_id;
  END IF;

  -- ── 9. Free table nếu có ──────────────────────────────────
  IF v_order.table_id IS NOT NULL THEN
    UPDATE tables
    SET status = 'AVAILABLE', current_order_id = NULL
    WHERE id = v_order.table_id;
  END IF;

  RETURN jsonb_build_object(
    'success',           true,
    'order_id',          p_order_id,
    'amount_paid',       v_amount_to_pay,
    'promo_deducted',    v_promo_deducted,
    'main_deducted',     v_main_deducted,
    'new_promo_balance', v_new_promo_bal,
    'new_main_balance',  v_new_main_bal
  );

EXCEPTION WHEN OTHERS THEN
  -- Toàn bộ transaction rollback tự động khi có exception
  RETURN jsonb_build_object('success', false, 'error_code', 'ERR_9002_INTERNAL_SERVER_ERROR',
                            'message', SQLERRM);
END;
$$;

-- ============================================================
-- Hết 005_pay_order_wallet.sql
-- ============================================================
