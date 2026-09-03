-- ============================================================
-- 004_cdp_functions.sql
-- Migration MỚI do B1 tự thêm khi code module CDP/Reports — theo đúng
-- nguyên tắc PLAN_BE.md mục 1 ("B1 cập nhật ERD.md trước → chạy
-- migration → thông báo cả nhóm mới được dùng"). File này bổ sung cho
-- ERD.md mục 3 (chỉ có 3 function gốc: fn_update_customer_after_order,
-- fn_suggest_customer_match, fn_merge_customer_profiles).
--
-- Chạy SAU KHI 001, 002, 003 đã chạy thành công.
-- ============================================================

-- ==================== 1. Phân khúc RFM ====================
-- GHI CHÚ GIẢ ĐỊNH NGHIỆP VỤ (API_CONTRACT.md mục 9 chỉ liệt kê 4 giá
-- trị segment: VIP, LOYAL, CHURN_RISK, NEW — không định nghĩa ngưỡng cụ
-- thể). Ngưỡng dưới đây suy luận từ SPEC.md phần nghiên cứu gốc (mục
-- 4.4.5 nhắc "Recency > 45 days" cho nhóm cần chăm sóc lại) và khớp mốc
-- hạng thành viên đã có trong trigger trg_order_completed (GOLD từ
-- 5,000,000đ). Team có thể chỉnh ngưỡng nếu thấy không phù hợp — sửa
-- trực tiếp hàm này qua CREATE OR REPLACE, không cần migration mới vì
-- không đổi cấu trúc bảng.
--
-- Thứ tự ưu tiên: khách chưa từng ghé (NEW) → khách lâu không quay lại
-- (CHURN_RISK, ưu tiên hơn cả VIP vì đây là nhóm cần re-engage nhất) →
-- chi tiêu cao (VIP) → ghé thường xuyên (LOYAL) → còn lại rơi về NEW.
CREATE OR REPLACE FUNCTION fn_customer_rfm_segment(c customers)
RETURNS TEXT AS $$
  SELECT CASE
    WHEN c.last_visit_at IS NULL OR c.total_visits = 0 THEN 'NEW'
    WHEN c.last_visit_at < (CURRENT_TIMESTAMP - INTERVAL '45 days') THEN 'CHURN_RISK'
    WHEN c.total_spent >= 5000000 THEN 'VIP'
    WHEN c.total_visits >= 5 THEN 'LOYAL'
    ELSE 'NEW'
  END;
$$ LANGUAGE sql IMMUTABLE;

-- SECURITY INVOKER (mặc định) — hàm chạy dưới quyền người gọi, RLS
-- policy owner_support_customer_read trên bảng customers vẫn áp dụng
-- bình thường, không cần lọc tenant_id thủ công trong hàm này.
CREATE OR REPLACE FUNCTION fn_list_customers_by_segment(p_segment TEXT)
RETURNS SETOF customers AS $$
  SELECT * FROM customers c WHERE fn_customer_rfm_segment(c) = p_segment;
$$ LANGUAGE sql STABLE;

-- ==================== 2. Top món bán chạy (Reports Dashboard) ====================
CREATE OR REPLACE FUNCTION fn_top_products(p_branch_id UUID, p_limit INT DEFAULT 5)
RETURNS TABLE(product_id UUID, product_name TEXT, total_quantity BIGINT) AS $$
  SELECT oi.product_id, oi.product_name, SUM(oi.quantity)::BIGINT AS total_quantity
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  WHERE o.branch_id = p_branch_id AND o.status = 'COMPLETED'
  GROUP BY oi.product_id, oi.product_name
  ORDER BY total_quantity DESC
  LIMIT p_limit;
$$ LANGUAGE sql STABLE;

-- ==================== 3. Doanh thu hôm nay (Reports Dashboard) ====================
-- GHI CHÚ GIẢ ĐỊNH: API_CONTRACT.md ghi "doanh thu tức thì" không nói
-- rõ khung thời gian — chọn "hôm nay" (theo giờ server UTC) làm nghĩa
-- literal phổ biến nhất cho dashboard vận hành. Đổi WHERE nếu team
-- muốn khung thời gian khác (theo ca làm việc, theo tuần...).
CREATE OR REPLACE FUNCTION fn_branch_revenue_today(p_branch_id UUID)
RETURNS NUMERIC AS $$
  SELECT COALESCE(SUM(final_amount), 0)
  FROM orders
  WHERE branch_id = p_branch_id
    AND status = 'COMPLETED'
    AND created_at::date = CURRENT_DATE;
$$ LANGUAGE sql STABLE;

-- ============================================================
-- Hết 004_cdp_functions.sql
-- ============================================================
