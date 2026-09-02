-- ============================================================
-- 002_functions.sql
-- Nguồn: ERD.md mục 3 (Triggers & Functions nghiệp vụ cốt lõi)
-- Chạy SAU KHI 001_init.sql đã chạy thành công.
-- ============================================================

-- 3.1. trg_order_completed — tự động cập nhật CDP khi đơn hàng hoàn tất
CREATE OR REPLACE FUNCTION fn_update_customer_after_order()
RETURNS TRIGGER AS $$
DECLARE
  v_points_earned INT;
  v_rate NUMERIC := 0.0001;
BEGIN
  IF NEW.status = 'COMPLETED' AND OLD.status <> 'COMPLETED' AND NEW.customer_id IS NOT NULL THEN
    v_points_earned := FLOOR(NEW.final_amount * v_rate);
    NEW.points_earned := v_points_earned;

    UPDATE customers
    SET total_spent = total_spent + NEW.final_amount,
        total_visits = total_visits + 1,
        loyalty_points = loyalty_points + v_points_earned - COALESCE(NEW.points_redeemed, 0),
        last_visit_at = NEW.created_at,
        first_visit_at = COALESCE(first_visit_at, NEW.created_at),
        membership_tier = CASE
          WHEN (total_spent + NEW.final_amount) >= 10000000 THEN 'DIAMOND'
          WHEN (total_spent + NEW.final_amount) >= 5000000 THEN 'GOLD'
          WHEN (total_spent + NEW.final_amount) >= 2000000 THEN 'SILVER'
          ELSE 'STANDARD'
        END
    WHERE id = NEW.customer_id;

    INSERT INTO loyalty_transactions(customer_id, order_id, type, points, balance_after, description)
    SELECT NEW.customer_id, NEW.id, 'EARN', v_points_earned, c.loyalty_points, 'Tích điểm từ đơn hàng ' || NEW.order_code
    FROM customers c WHERE c.id = NEW.customer_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_order_completed
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION fn_update_customer_after_order();

-- 3.2. So khớp mờ giao dịch lỗi (dùng pg_trgm thay Levenshtein thuần)
CREATE OR REPLACE FUNCTION fn_suggest_customer_match(p_transfer_content TEXT, p_tenant_id UUID)
RETURNS TABLE(customer_id UUID, full_name VARCHAR, similarity_score FLOAT) AS $$
  SELECT c.id, c.full_name, similarity(c.full_name, p_transfer_content) AS score
  FROM customers c
  WHERE c.tenant_id = p_tenant_id
  ORDER BY score DESC
  LIMIT 5;
$$ LANGUAGE sql STABLE;

-- 3.3. fn_merge_customer_profiles — hợp nhất hồ sơ trùng lặp
CREATE OR REPLACE FUNCTION fn_merge_customer_profiles(source_id UUID, target_id UUID)
RETURNS VOID AS $$
BEGIN
    IF source_id = target_id THEN
        RAISE EXCEPTION 'source_id and target_id must be different';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM customers source_customer
        JOIN customers target_customer ON target_customer.tenant_id = source_customer.tenant_id
        WHERE source_customer.id = source_id AND target_customer.id = target_id
    ) THEN
        RAISE EXCEPTION 'customers must belong to the same tenant';
    END IF;

  UPDATE orders SET customer_id = target_id WHERE customer_id = source_id;
  UPDATE loyalty_transactions SET customer_id = target_id WHERE customer_id = source_id;
    UPDATE payment_transactions SET matched_customer_id = target_id WHERE matched_customer_id = source_id;
    UPDATE support_tickets SET customer_id = target_id WHERE customer_id = source_id;
    UPDATE customer_vouchers SET customer_id = target_id WHERE customer_id = source_id;
    UPDATE coffee_pass_subscriptions SET customer_id = target_id WHERE customer_id = source_id;
  UPDATE wallet_transactions SET wallet_id = (SELECT id FROM wallets WHERE customer_id = target_id)
    WHERE wallet_id = (SELECT id FROM wallets WHERE customer_id = source_id);

  UPDATE customers t SET
    total_spent = t.total_spent + s.total_spent,
    total_visits = t.total_visits + s.total_visits,
    loyalty_points = t.loyalty_points + s.loyalty_points,
    first_visit_at = LEAST(t.first_visit_at, s.first_visit_at),
    last_visit_at = GREATEST(t.last_visit_at, s.last_visit_at),
    email = COALESCE(t.email, s.email),
    dietary_notes = COALESCE(t.dietary_notes, s.dietary_notes)
  FROM customers s WHERE s.id = source_id AND t.id = target_id;

  DELETE FROM wallets WHERE customer_id = source_id;
  DELETE FROM customers WHERE id = source_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- Hết 002_functions.sql — tiếp theo chạy 003_rls.sql
-- ============================================================
