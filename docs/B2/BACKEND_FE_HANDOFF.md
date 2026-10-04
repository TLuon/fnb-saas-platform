# Backend B1+B2 — Frontend Integration & Handoff Specification

> **Tài liệu bàn giao chính thức cho Frontend Team**  
> **Cập nhật:** Khớp 100% với Controller, DTO validation, Decorators và Realtime Gateway thực tế trong mã nguồn NestJS.

---

## 1. Backend Status & Verification Gates

| Metric | Status | Details |
|---|:---:|---|
| **Build** | **PASS** | `nest build` thành công, artifact chuẩn sẵn sàng trong thư mục `dist/`. |
| **Typecheck** | **PASS** | `tsc --noEmit` đạt 0 lỗi chẩn đoán TypeScript trên toàn bộ codebase. |
| **Tests** | **PASS** | 82/82 automated unit tests chạy đạt 100% trên 11 test suites (`vitest run`). |
| **Lint** | **PASS** | `oxlint src/ test/` đạt 0 warning, 0 error trên toàn bộ files. |
| **Git Diff Check** | **PASS** | `git diff --check` sạch, không có whitespace errors hoặc unresolved merge conflicts. |
| **Supabase Live E2E** | **NOT LIVE VERIFIED** | Migration SQL 001..007 đã hoàn thiện cấu trúc DB/RPC/RLS nhưng chưa apply trực tiếp lên remote Supabase production/staging (tuân thủ chỉ thị không reset/apply remote). |
| **Redis Live E2E** | **NOT LIVE VERIFIED** | Đã kiểm thử logic Redis state qua unit/integration test mock (ioredis-mock). Chưa kết nối cụm Redis cluster vật lý. |

---

## 2. Global API Configuration

- **Base URL:** `http://localhost:3000/api/v1` (tất cả các endpoint đều có prefix `/api/v1`).
- **Standard Response Envelope:**
  ```json
  // Thành công:
  { "success": true, "data": { ... }, "error": null }
  // Thất bại:
  { "success": false, "data": null, "error": { "code": "ERR_XXXX", "message": "..." } }
  ```
- **Authentication Header:**
  Gửi kèm với tất cả các request yêu cầu xác thực:
  ```http
  Authorization: Bearer <access_token>
  ```
- **Socket.IO Realtime Endpoint:**
  `ws://localhost:3000` (hoặc `http://localhost:3000` với transports `['websocket']`)
  Handshake auth:
  ```javascript
  import { io } from 'socket.io-client';
  const socket = io('http://localhost:3000', {
    auth: { token: `Bearer ${accessToken}` },
    transports: ['websocket'],
  });
  ```
- **CORS Configuration:**
  - Hỗ trợ biến môi trường `CORS_ORIGIN` (danh sách domain phân tách bằng dấu phẩy).
  - Tự động cho phép `http://localhost:5173` và `http://localhost:3001` trong môi trường phát triển (`NODE_ENV !== 'production'`).
  - Cấu hình đồng bộ nhất quán giữa Express HTTP (`main.ts`) và Socket.IO Gateway (`realtime.gateway.ts`).

---

## 3. Detailed Endpoint Inventory

### 3.1 Auth Module (`/api/v1/auth`)

| Method | Endpoint | Auth / Role | Request Body | Response Fields | Ghi chú |
|---|---|---|---|---|---|
| `POST` | `/api/v1/auth/register` | **Public** | **Req:** `tenant_subdomain`, `email`, `password`<br>**Opt:** `full_name`, `phone` | `{ customer_id, email }` | Tự động tạo customer và khởi tạo wallet rỗng trong tenant. |
| `POST` | `/api/v1/auth/login` | **Public** | **Req:** `email`, `password`<br>**Opt:** `phone` | `{ access_token, refresh_token, expires_in, token_type }` | **LƯU Ý:** Hệ thống dùng chung endpoint `/login` cho mọi vai trò. Không dùng các route con bị loại bỏ (`/login/owner`, `/login/staff-pin`, `/login/customer-otp`). |
| `POST` | `/api/v1/auth/refresh` | **Public** | **Req:** `refresh_token` | `{ access_token, refresh_token, expires_in, token_type }` | Cấp mới access token khi token cũ hết hạn. |
| `GET` | `/api/v1/auth/me` | **Authenticated**<br>(Tất cả roles) | *None* | `{ id, email, full_name, role_app, tenant_id, branch_id }` | Trả về thông tin hồ sơ và quyền người dùng từ token. |

---

### 3.2 Floor & Table Management (`/api/v1`)

| Method | Endpoint | Auth / Role | Request Body / Query | Response Fields | Ghi chú |
|---|---|---|---|---|---|
| `GET` | `/api/v1/floors` | `OWNER`, `STAFF`, `CUSTOMER` | **Query Opt:** `branch_id` (UUID) | `Floor[]` (`id`, `name`, `floor_number`, `background_svg`) | Danh sách tầng thuộc chi nhánh. |
| `POST` | `/api/v1/floors` | `OWNER` | **Req:** `branch_id` (UUID), `name`, `floor_number`<br>**Opt:** `background_svg` | `Floor` object | Tạo sơ đồ tầng mới. |
| `GET` | `/api/v1/floors/:id/tables` | `OWNER`, `STAFF`, `CUSTOMER` | **Path:** `:id` (Floor UUID) | `Table[]` | Danh sách bàn của tầng (kèm tọa độ floor map). |
| `POST` | `/api/v1/tables` | `OWNER` | **Req:** `floor_id` (UUID), `table_code`, `capacity`, `pos_x`, `pos_y`<br>**Opt:** `width`, `height`, `shape`, `is_active` | `Table` object | Tạo bàn mới trên sơ đồ. |
| `PATCH` | `/api/v1/tables/:id` | `OWNER` | **Path:** `:id` (Table UUID)<br>**Opt:** `table_code`, `capacity`, `pos_x`, `pos_y`, `width`, `height`, `shape`, `is_active` | `Table` object | Cập nhật vị trí kéo thả / thông tin bàn. |
| `PATCH` | `/api/v1/tables/:id/status` | `STAFF` | **Path:** `:id` (Table UUID)<br>**Req:** `status` (`AVAILABLE` \| `OCCUPIED` \| `RESERVED` \| `CLEANING` \| `OUT_OF_SERVICE`) | `Table` object | Đổi trạng thái bàn, tự động emit `table_status_changed`. |

---

### 3.3 Menu & Product Management (`/api/v1`)

| Method | Endpoint | Auth / Role | Request Body / Query | Response Fields | Ghi chú |
|---|---|---|---|---|---|
| `GET` | `/api/v1/categories` | `OWNER`, `STAFF`, `CUSTOMER` | *None* | `Category[]` | Danh mục món ăn & thức uống. |
| `POST` | `/api/v1/categories` | `OWNER` | **Req:** `name`<br>**Opt:** `display_order`, `kitchen_station` (`BAR` \| `KITCHEN`) | `Category` object | Tạo danh mục món mới. |
| `PATCH` | `/api/v1/categories/:id` | `OWNER` | **Path:** `:id` (Category UUID)<br>**Opt:** `name`, `display_order`, `kitchen_station` | `Category` object | Sửa danh mục món. |
| `DELETE` | `/api/v1/categories/:id` | `OWNER` | **Path:** `:id` (Category UUID) | `Category` object | Xóa danh mục (bị chặn nếu còn món đang active). |
| `GET` | `/api/v1/products` | `OWNER`, `STAFF`, `CUSTOMER` | **Query Opt:** `category_id` (UUID) | `Product[]` | Khách chỉ xem được món có `is_active = true`. |
| `POST` | `/api/v1/products` | `OWNER` | **Req:** `name`, `price` (>= 0)<br>**Opt:** `category_id` (UUID), `image_url`, `description`, `default_modifiers` | `Product` object | Thêm món ăn / thức uống mới vào thực đơn. |
| `PATCH` | `/api/v1/products/:id` | `OWNER` | **Path:** `:id` (Product UUID)<br>**Opt:** `name`, `price`, `category_id`, `image_url`, `description`, `is_active`, `default_modifiers` | `Product` object | Sửa thông tin món. |
| `DELETE` | `/api/v1/products/:id` | `OWNER` | **Path:** `:id` (Product UUID) | `Product` object | Soft-delete: cập nhật `is_active = false`. |

---

### 3.4 Staff Management (`/api/v1/staff`)

| Method | Endpoint | Auth / Role | Request Body / Query | Response Fields | Ghi chú |
|---|---|---|---|---|---|
| `GET` | `/api/v1/staff` | `OWNER` | **Query Opt:** `branch_id` (UUID) | `Staff[]` | Danh sách nhân viên trong chi nhánh. |
| `POST` | `/api/v1/staff` | `OWNER` | **Req:** `email`, `password`, `full_name`, `phone`, `role` (`STAFF` \| `SUPPORT`)<br>**Opt:** `branch_id` (UUID) | `Staff` object | Tạo tài khoản nhân sự mới (gọi Supabase Auth Admin). |
| `PATCH` | `/api/v1/staff/:id` | `OWNER` | **Path:** `:id` (Staff UUID)<br>**Opt:** `full_name`, `phone`, `role`, `branch_id`, `is_active` | `Staff` object | Cập nhật thông tin nhân viên. |
| `PATCH` | `/api/v1/staff/:id/deactivate` | `OWNER` | **Path:** `:id` (Staff UUID) | `Staff` object | Vô hiệu hóa nhân viên (cấm vô hiệu hóa Owner cuối cùng). |

---

### 3.5 Reservation & Payment Webhook (`/api/v1/reservations`)

| Method | Endpoint | Auth / Role | Request Body / Param / Header | Response Fields | Ghi chú |
|---|---|---|---|---|---|
| `POST` | `/api/v1/reservations/lock` | `CUSTOMER` | **Req:** `table_id` (UUID) | `{ reservation_code, expires_at, deposit_amount }` | Khóa tạm bàn 10 phút trên Redis và chuyển bàn sang `PENDING_LOCK`. |
| `POST` | `/api/v1/reservations/:code/generate-qr` | `CUSTOMER` | **Path:** `:code` (`RES_XXXXX`) | `{ qr_string, amount, code }` | Lấy chuỗi VietQR chứa mã cọc và số tiền cọc (50.000đ). |
| `POST` | `/api/v1/reservations/webhook/mock-payment`<br>*hoặc*<br>`/api/v1/reservations/webhook/mock-payment/:tenantId` | **Public** (Webhook) | **Headers:** `x-webhook-secret` (bắt buộc trong prod)<br>**Opt Headers:** `x-tenant-id`<br>**Req Body:** `raw_transfer_content`, `amount` (> 0)<br>**Opt Body:** `tenant_id` (UUID) | `{ message, payment_transaction_id, idempotent }` | Webhook thanh toán cọc ngân hàng mock. Chống trùng lặp mức Database (PostgreSQL index `uq_payment_transactions_res_completed`). |
| `DELETE` | `/api/v1/reservations/:code` | `CUSTOMER` | **Path:** `:code` (`RES_XXXXX`) | `{ message }` | Khách hủy giữ chỗ, hoàn trả bàn về `AVAILABLE`. |

---

### 3.6 Order, POS & KDS (`/api/v1/orders`)

| Method | Endpoint | Auth / Role | Request Body | Response Fields | Ghi chú |
|---|---|---|---|---|---|
| `POST` | `/api/v1/orders` | `STAFF` | **Req:** `table_id` (UUID)<br>**Opt:** `reservation_code` (string) | `{ order_id, order_code, deposit_applied }` | **Atomic Check-in:** Khóa bàn `FOR UPDATE`, khấu trừ cọc đặt bàn và liên kết đơn hàng trong 1 DB transaction (`fn_create_order`). |
| `GET` | `/api/v1/orders/:id` | `STAFF`, `CUSTOMER`, `OWNER` | **Path:** `:id` (Order UUID) | `{ id, order_code, status, subtotal, discount_amount, final_amount, order_items: [...] }` | Xem chi tiết đơn hàng và các món. |
| `POST` | `/api/v1/orders/:id/items` | `STAFF`, `CUSTOMER` | **Path:** `:id` (Order UUID)<br>**Req:** `product_id` (UUID), `quantity` (>= 1)<br>**Opt:** `modifiers` (array) | `{ message }` | Thêm món trực tiếp vào đơn hàng đơn lẻ. |
| `PATCH` | `/api/v1/orders/:id/items/:itemId` | `STAFF`, `CUSTOMER` | **Path:** `:id`, `:itemId`<br>**Opt:** `quantity`, `modifiers` | `{ message }` | Sửa số lượng/món trước khi gửi bếp. |
| `POST` | `/api/v1/orders/:id/submit-kitchen` | `STAFF` | **Path:** `:id` (Order UUID) | `{ message }` | Chốt món gửi bếp, phát sự kiện realtime `kds_new_ticket` theo từng trạm bếp/bar. |
| `PATCH` | `/api/v1/orders/:id/items/:itemId/kitchen-status` | `STAFF` | **Path:** `:id`, `:itemId`<br>**Req:** `kitchen_status` (`QUEUED` \| `PREPARING` \| `READY` \| `SERVED` \| `CANCELLED`) | `{ message }` | Cập nhật tiến độ món, phát `kds_item_status_changed`. |
| `POST` | `/api/v1/orders/:id/pay` | `STAFF`, `CUSTOMER` | **Path:** `:id`<br>**Req:** `payment_method` (`VIETQR` \| `WALLET` \| `COFFEE_PASS`)<br>**Opt:** `coffee_pass_subscription_id` (UUID), `totp_code` (string) | `{ message }` | Thanh toán đơn hàng. Với `WALLET`, gọi atomic DB transaction `fn_pay_order_wallet`. |

---

### 3.7 Group Order Module (`/api/v1/group-order`) — *Prefix số ít: `group-order`*

| Method | Endpoint | Auth / Role | Request Body | Response Fields | Ghi chú |
|---|---|---|---|---|---|
| `POST` | `/api/v1/group-order/join` | `CUSTOMER` | **Req:** `table_id` (UUID) | `{ session_key, member_info, cart }` | Tham gia phiên gọi món chung tại bàn. Lưu giỏ hàng Redis TTL 7200s. **LƯU Ý:** Không có route `/group-orders/session`. |
| `GET` | `/api/v1/group-order/:tableId/cart` | `CUSTOMER` | **Path:** `:tableId` (Table UUID) | `Cart` object (`cart_items`, `cart_total`, `confirmed`) | Lấy thông tin giỏ hàng nhóm hiện tại. |
| `POST` | `/api/v1/group-order/:tableId/cart/items` | `CUSTOMER` | **Path:** `:tableId`<br>**Req:** `product_id` (UUID), `quantity` (>= 1)<br>**Opt:** `modifiers` (array) | `{ message, cart }` | Thêm món vào giỏ nhóm (concurrency watch & multi setex). Phát `group_order_cart_updated`. |
| `POST` | `/api/v1/group-order/:tableId/confirm` | `CUSTOMER`, `STAFF` | **Path:** `:tableId` | `{ message }` | Chốt giỏ hàng nhóm vào đơn hàng và gửi bếp. Tự động rollback xóa món đã insert và giữ nguyên giỏ hàng nếu downstream KDS lỗi. |

---

### 3.8 Wallet & Vouchers (`/api/v1/wallet`)

| Method | Endpoint | Auth / Role | Request Body / Query | Response Fields | Ghi chú |
|---|---|---|---|---|---|
| `GET` | `/api/v1/wallet` | `CUSTOMER` | *None* | `{ id, main_balance, promo_balance, is_locked }` | Tra cứu số dư ví chính và ví khuyến mãi của khách. |
| `POST` | `/api/v1/wallet/topup` | `CUSTOMER` | **Req:** `amount` (số dương >= 1, cấm NaN/Infinity) | `{ message, new_balance }` | Nạp tiền vào ví chính (môi trường dev/mock). |
| `GET` | `/api/v1/wallet/transactions` | `CUSTOMER` | **Query Opt:** `page` (int, def 1), `limit` (int, def 20) | `{ data: WalletTransaction[], total, page, limit }` | Lịch sử biến động số dư ví (phân trang). |
| `GET` | `/api/v1/wallet/vouchers` | `CUSTOMER` | *None* | `Voucher[]` | Danh sách voucher giảm giá khách đang sở hữu. |

---

### 3.9 Coffee Pass (`/api/v1/coffee-pass`)

| Method | Endpoint | Auth / Role | Request Body | Response Fields | Ghi chú |
|---|---|---|---|---|---|
| `GET` | `/api/v1/coffee-pass/plans` | `CUSTOMER` | *None* | `CoffeePassPlan[]` | Danh sách các gói đăng ký Coffee Pass khả dụng. |
| `POST` | `/api/v1/coffee-pass/subscribe` | `CUSTOMER` | **Req:** `plan_id` (UUID) | `{ message, subscription_id }` | Mua gói: atomic RPC `fn_subscribe_coffee_pass` trừ tiền ví và kích hoạt gói đăng ký trong 1 DB transaction. |
| `GET` | `/api/v1/coffee-pass/:id/current-code` | `CUSTOMER` | **Path:** `:id` (Subscription UUID) | `{ subscription_id, totp_code, remaining_seconds }` | Lấy mã OTP xoay 30 giây để hiển thị QR đổi món. |
| `POST` | `/api/v1/coffee-pass/:id/redeem` | `STAFF`, `OWNER` | **Path:** `:id` (Subscription UUID)<br>**Req:** `totp_code` (string) | `{ message, remaining_redemptions }` | Nhân viên quét mã xác thực TOTP và trừ lượt đổi món trong ngày. |

---

### 3.10 Customer Support & CSAT (`/api/v1/support`)

| Method | Endpoint | Auth / Role | Request Body / Query | Response Fields | Ghi chú |
|---|---|---|---|---|---|
| `POST` | `/api/v1/support/csat` | `CUSTOMER` | **Req:** `order_id` (UUID), `csat_score` (1..5)<br>**Opt:** `complaint_note` | `{ message, ticket_id }` | Đánh giá đơn hàng. Tự động sinh ticket khẩn cấp nếu CSAT <= 2. |
| `GET` | `/api/v1/support/unmatched` | `SUPPORT`, `OWNER` | **Query Opt:** `page` (def 1), `limit` (def 20) | `{ data: UnmatchedTransaction[], total, page, limit }` | Danh sách các giao dịch chuyển khoản sai nội dung. |
| `GET` | `/api/v1/support/unmatched/:id/suggest` | `SUPPORT`, `OWNER` | **Path:** `:id` (Unmatched UUID) | `Suggestion[]` | Gợi ý khách hàng trùng khớp qua số tiền / thời gian. |
| `POST` | `/api/v1/support/unmatched/:id/propose` | `SUPPORT` | **Path:** `:id`<br>**Req:** `suggested_customer_id` (UUID)<br>**Opt:** `maker_note` | `{ message }` | Maker đề xuất ghép giao dịch cho khách hàng. |
| `POST` | `/api/v1/support/unmatched/:id/approve` | `SUPPORT`, `OWNER` | **Path:** `:id` | `{ message }` | Checker phê duyệt (nghiêm cấm self-approval nếu Maker trùng Checker). |
| `GET` | `/api/v1/support/tickets` | `SUPPORT`, `OWNER` | **Query Opt:** `page` (def 1), `limit` (def 20) | `{ data: SupportTicket[], total, page, limit }` | Danh sách ticket CSAT cần hỗ trợ (ưu tiên URGENT). |
| `POST` | `/api/v1/support/tickets/:id/resolve` | `SUPPORT`, `OWNER` | **Path:** `:id` (Ticket UUID)<br>**Opt:** `resolution_note`, `discount_percent` (1..100), `free_item_product_id` (UUID) | `{ message, voucher }` | Xử lý khiếu nại, tùy chọn phát voucher bồi thường. |
| `POST` | `/api/v1/support/customers/merge` | `SUPPORT`, `OWNER` | **Req:** `source_customer_id` (UUID), `target_customer_id` (UUID) | `{ message }` | Hợp nhất hồ sơ khách hàng trùng lặp. Đảm bảo cô lập tenant (`ERR_1003_TENANT_MISMATCH`). |

---

### 3.11 CDP & Loyalty Reports (`/api/v1/cdp`, `/api/v1/reports`)

| Method | Endpoint | Auth / Role | Request Body / Query | Response Fields | Ghi chú |
|---|---|---|---|---|---|
| `GET` | `/api/v1/cdp/customers` | `OWNER`, `SUPPORT` | **Query Opt:** `segment` (`VIP` \| `LOYAL` \| `CHURN_RISK` \| `NEW`) | `Customer[]` | Danh sách khách hàng phân khúc RFM. |
| `GET` | `/api/v1/cdp/customers/:id/360` | `OWNER`, `SUPPORT` | **Path:** `:id` (Customer UUID) | `Customer360` object | Hồ sơ 360 độ: lịch sử đơn hàng, điểm tích lũy, tổng chi tiêu. |
| `POST` | `/api/v1/cdp/customers/:id/vouchers` | `OWNER`, `SUPPORT` | **Path:** `:id`<br>**Req:** `voucher_code`, `discount_percent` (1..100), `expires_at` (ISO date) | `Voucher` object | Phát voucher kích hoạt lại khách hàng. |
| `GET` | `/api/v1/reports/dashboard` | `OWNER` | **Query Opt:** `branch_id` (UUID) | `{ revenue, order_count, occupancy_rate }` | Báo cáo doanh thu và công suất bàn. |

---

## 4. Realtime Events Specification (Socket.IO)

| Event Name | Room Name | Trigger & Authority | Payload Example |
|---|---|---|---|
| `table_status_changed` | `tenant:{tenant_id}` | Phát ra khi bàn chuyển trạng thái (`AVAILABLE`, `OCCUPIED`, `RESERVED`...) | `{ "table_id": "uuid", "status": "OCCUPIED" }` |
| `kds_new_ticket` | `kds:{branch_id}` | Khi Staff nhấn submit gửi món bếp/bar | `{ "order_id": "uuid", "table_code": "B01", "station": "KITCHEN", "items": [...] }` |
| `kds_item_status_changed` | `kds:{branch_id}` | Khi Bếp/Bar cập nhật trạng thái món (`PREPARING`, `READY`, `SERVED`) | `{ "order_item_id": "uuid", "kitchen_status": "READY" }` |
| `group_order_cart_updated` | `group_order:{tenant_id}:{table_id}` | Khi có thành viên thêm món hoặc khi chốt giỏ hàng nhóm | `{ "table_id": "uuid", "cart_items": [...], "cart_total": 50000, "confirmed": false }` |
| `unmatched_transaction_created` | `support:{tenant_id}` | Webhook nhận thanh toán sai nội dung chuyển khoản | `{ "transaction_id": "uuid", "amount": 100000, "raw_transfer_content": "..." }` |
| `support_ticket_urgent_created` | `support:{tenant_id}` | Khách hàng đánh giá CSAT tiêu cực (<= 2 sao) | `{ "ticket_id": "uuid", "order_id": "uuid", "csat_score": 1, "complaint_note": "..." }` |

### Room Subscriptions từ Client:
- **`join_group_order`**: Client gửi `{ table_id: "<uuid>" }`.
  - Server xác thực JWT claim `tenant_id`.
  - Server kiểm tra phiên bàn đang hoạt động trong Redis (`session:{tenant_id}:{table_id}`). Nếu không có active session, từ chối tham gia để chống nghe lén dữ liệu bàn khác.
  - Server join client vào room `group_order:{tenant_id}:{table_id}` và phản hồi event `joined_group_order`.
- **`leave_group_order`**: Client gửi `{ table_id: "<uuid>" }` khi rời bàn. Server remove client khỏi room.

---

## 5. Security & Concurrency Guarantees

1. **Idempotency Webhook Ngân Hàng:**
   - Bảo vệ 2 lớp: Application check + Database Unique Partial Index `uq_payment_transactions_res_completed` trên `(tenant_id, reservation_code) WHERE (status = 'COMPLETED')`.
   - Các request webhook trùng lặp hoặc đến đồng thời đều trả về kết quả `idempotent: true` an toàn, không tạo giao dịch kép.
2. **Khấu Trừ Cọc Đặt Bàn (Check-in):**
   - Đảm bảo một mã đặt bàn chỉ được khấu trừ tối đa 1 lần duy nhất vào đúng 1 đơn hàng qua atomic stored procedure `fn_create_order` với khóa dòng `FOR UPDATE`.
3. **Thanh Toán Ví Điện Tử & Coffee Pass:**
   - Sử dụng atomic PostgreSQL RPC `fn_subscribe_coffee_pass` và `fn_pay_order_wallet` với `SECURITY DEFINER` và `SET search_path = public`.
   - Khóa dòng ví `FOR UPDATE`, kiểm tra số dư và trừ theo thứ tự ưu tiên `PROMO` trước, `MAIN` sau.
4. **Cô Lập Dữ Liệu Multi-Tenant:**
   - Toàn bộ truy vấn đều qua `tenant_id` lấy trực tiếp từ Supabase JWT verified.
   - Hàm gộp hồ sơ khách hàng `fn_merge_customer_profiles` chủ động kiểm tra `v_source_tenant = v_target_tenant` trước mọi thao tác, chặn hoàn toàn rủi ro cross-tenant merge.
