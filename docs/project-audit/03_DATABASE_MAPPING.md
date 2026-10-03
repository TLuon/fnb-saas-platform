# 03 — ÁNH XẠ CƠ SỞ DỮ LIỆU & MIGRATIONS (DATABASE MAPPING)

> **Dự án:** F&B SaaS Multi-Tenant Platform  
> **Database Engine:** PostgreSQL (Supabase Managed)  
> **Thư mục Migration:** `backend/api/database/migrations/`  

---

## 1. DANH SÁCH MIGRATIONS ĐÃ XÁC MINH TRONG SOURCE

| STT | File Migration | Nội dung & Mục đích | Trạng thái |
|:---:|:---|:---|:---:|
| 1 | `001_init.sql` | Khởi tạo cấu trúc các bảng cốt lõi: `tenants`, `branches`, `users`, `floors`, `tables`, `categories`, `products`, `orders`, `order_items`, `payment_transactions`, `audit_logs`. | Đã áp dụng |
| 2 | `002_functions.sql` | Các hàm sinh mã đơn, tính tổng tiền, trigger tự động cập nhật `updated_at`. | Đã áp dụng |
| 3 | `003_rls.sql` | Kích hoạt Row Level Security (RLS) cho toàn bộ các bảng; hàm `custom_access_token_hook` để inject claims `role_app`, `tenant_id`, `branch_id` vào JWT; các hàm `app_auth.tenant_id()`, `app_auth.role_app()`. | Đã áp dụng |
| 4 | `004_cdp_functions.sql` | Khởi tạo CDP (Customer Data Platform): phân khúc khách hàng (`customers.membership_tier`, RFM) và xử lý gộp hồ sơ trùng số điện thoại. | Đã áp dụng |
| 5 | `005_pay_order_wallet.sql` | Hàm atomic RPC `fn_pay_order_wallet`: trừ tiền ví khách hàng, khấu trừ voucher và cập nhật đơn hàng thành `COMPLETED` trong 1 transaction. | Đã áp dụng |
| 6 | `006_rls_and_merge_fixes.sql` | Bổ sung các policy RLS cho Maker-Checker của phân hệ Support và quản lý thẻ Coffee Pass. | Đã áp dụng |
| 7 | `007_financial_and_security_fixes.sql` | Hàm `fn_create_order` phiên bản đầu, khóa dòng bàn và tiền cọc chống duplicate credit. | Đã áp dụng |
| 8 | `008_shifts_and_takeaway.sql` | Bảng `shifts` quản lý ca làm việc; hỗ trợ cột `order_type` (`DINE_IN`, `TAKEAWAY`, `DELIVERY`) và cho phép `table_id NULL` trên đơn mang đi. | Đã áp dụng |
| 9 | `009_inventory.sql` | Bảng `ingredients` (nguyên liệu), `recipes` (công thức pha chế/định lượng BOM), `inventory_transactions` (nhập/xuất/kiểm kê kho). | Đã áp dụng |
| 10 | `010_b1_fixes.sql` | Tối ưu hóa toàn diện: hoàn thiện atomic RPC `fn_create_order` và hàm atomic trừ kho `fn_consume_inventory_for_order` (chống trừ kho 2 lần bằng partial index & FOR UPDATE). | Đã áp dụng |
| 11 | `011_product_images_and_reservations.sql` | Thêm cột `products.image_url`; tạo bảng `reservations` (quản lý đặt bàn trước, cọc tiền) cùng RLS và index. | Đã áp dụng |
| 12 | `012_allow_cash_payment.sql` | Gỡ bỏ check constraint cũ trên cột `orders.payment_method` và thêm lại constraint cho phép giá trị `'CASH'` (`CHECK (payment_method IN ('VIETQR', 'WALLET', 'COFFEE_PASS', 'CASH'))`). | Đã áp dụng |

---

## 2. BẢNG DỮ LIỆU & QUAN HỆ CHÍNH (ENTITY RELATIONSHIP)

### 2.1. Đa người dùng & Phân quyền (Tenancy & Users)
- **`tenants`**: `id` (PK, UUID), `name`, `subdomain` (UNIQUE, vd: `cafe-and-cake`).
- **`branches`**: `id` (PK, UUID), `tenant_id` (FK -> `tenants.id`), `name`, `address`.
- **`users`**: `id` (PK, UUID), `auth_user_id` (UUID, khớp Supabase Auth `auth.users.id`), `tenant_id` (FK), `branch_id` (FK, NULL đối với OWNER/SUPPORT), `role` (`OWNER`, `MANAGER`, `STAFF`, `SUPPORT`), `full_name`, `phone`, `is_active`.
- **`customers`**: `id` (PK, UUID), `auth_user_id` (FK), `tenant_id` (FK), `full_name`, `phone`, `email`, `membership_tier`, `loyalty_points`.

### 2.2. Sơ đồ Bàn & Đặt chỗ (Floors, Tables & Reservations)
- **`floors`**: `id` (PK, UUID), `branch_id` (FK), `name`, `floor_level`.
- **`tables`**: `id` (PK, UUID), `floor_id` (FK), `table_code` (vd: `B01`), `capacity`, `pos_x`, `pos_y`, `shape`, `status` (`AVAILABLE`, `OCCUPIED`, `RESERVED`, `CLEANING`, `PENDING_LOCK`), `current_order_id` (FK -> `orders.id`).
- **`reservations`**: `id` (PK, UUID), `tenant_id` (FK), `table_id` (FK), `customer_id` (FK), `reservation_code` (UNIQUE), `reservation_time`, `deposit_amount`, `status` (`PENDING`, `PAID`, `CHECKED_IN`, `CANCELLED`, `EXPIRED`).

### 2.3. Menu, Sản phẩm & Kho (Menu & Inventory)
- **`categories`**: `id` (PK, UUID), `tenant_id` (FK), `name`, `kitchen_station` (`BAR`, `KITCHEN`).
- **`products`**: `id` (PK, UUID), `tenant_id` (FK), `category_id` (FK), `name`, `price`, `image_url` (Cloudinary URL), `is_active`.
- **`ingredients`**: `id` (PK, UUID), `tenant_id` (FK), `name`, `sku` (UNIQUE theo tenant), `unit`, `current_stock`, `min_stock_alert`, `cost_per_unit`.
- **`recipes`**: `id` (PK, UUID), `product_id` (FK), `ingredient_id` (FK), `quantity_required`.
- **`inventory_transactions`**: `id` (PK, UUID), `tenant_id` (FK), `branch_id` (FK), `ingredient_id` (FK), `order_id` (FK, NULL nếu là nhập/xuất tay), `type` (`IMPORT`, `EXPORT`, `ADJUSTMENT`, `ORDER_CONSUMPTION`), `quantity`, `balance_after`, `created_by`.

### 2.4. Đơn hàng, Ca làm việc & Thanh toán (Orders, Shifts & Payments)
- **`shifts`**: `id` (PK, UUID), `tenant_id` (FK), `branch_id` (FK), `opened_by` (FK -> `users.id`), `opened_at`, `closed_at`, `starting_cash`, `ending_cash_actual`, `ending_cash_system`, `status` (`OPEN`, `CLOSED`).
- **`orders`**:
  - `id` (PK, UUID), `tenant_id` (FK), `branch_id` (FK), `table_id` (FK, NULL với Takeaway/Delivery), `customer_id` (FK, NULL với vãng lai).
  - `order_code` (vd: `ORD-M9TBSU`).
  - `order_type` (`DINE_IN`, `TAKEAWAY`, `DELIVERY`).
  - `status` (`PENDING`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`).
  - `subtotal`, `discount_amount`, `final_amount`, `deposit_applied`.
  - `payment_method`: Ràng buộc `CHECK (payment_method IN ('VIETQR', 'WALLET', 'COFFEE_PASS', 'CASH'))`.
  - `shift_id` (FK -> `shifts.id`).
- **`order_items`**: `id` (PK, UUID), `order_id` (FK), `product_id` (FK), `product_name`, `quantity`, `unit_price`, `modifiers` (JSONB), `kitchen_status` (`QUEUED`, `PREPARING`, `READY`, `SERVED`).
- **`payment_transactions`**: `id` (PK, UUID), `tenant_id` (FK), `order_id` (FK), `reservation_code`, `amount`, `status` (`PENDING`, `COMPLETED`, `UNMATCHED`), `raw_transfer_content`.

---

## 3. CÁC HÀM POSTGRESQL ATOMIC RPC (STORED PROCEDURES)

1. **`fn_create_order`**:
   - Khóa dòng bàn `FOR UPDATE` nếu là `DINE_IN`, từ chối nếu bàn đang `OCCUPIED`/`CLEANING`.
   - Với đơn `TAKEAWAY` và `DELIVERY`, không bắt buộc có `table_id`.
   - Khóa tiền cọc từ `payment_transactions` `FOR UPDATE` (nếu có `p_reservation_code`), bảo vệ chống trừ cọc kép.
   - Tự động map vào ca làm việc `OPEN` của chi nhánh.
2. **`fn_consume_inventory_for_order`**:
   - Khóa đơn hàng `FOR UPDATE`.
   - Kiểm tra `inventory_transactions` với `type = 'ORDER_CONSUMPTION'` và `order_id = p_order_id` để đảm bảo tính Idempotent (không trừ kho 2 lần nếu gọi lặp).
   - Duyệt `order_items` và trừ kho tương ứng theo bảng `recipes` (BOM).
3. **`fn_pay_order_wallet`**:
   - Thực hiện trừ số dư ví (`wallets.main_balance` & `promo_balance`) và chuyển trạng thái đơn hàng sang `COMPLETED` trong một transaction duy nhất.
4. **`custom_access_token_hook`**:
   - Được gắn vào Supabase Auth Token Generation Hook để nhúng claims bảo mật `role_app`, `tenant_id`, `branch_id` vào Access Token.
