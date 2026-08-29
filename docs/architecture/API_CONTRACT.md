# API_CONTRACT.md — Hợp Đồng API (NestJS Backend)

> Phụ thuộc: `ERD.md` (entity/status), `RLS_POLICIES.md` (quyền), `ERROR_CODES.md` (mã lỗi trả về).
> Base URL: `/api/v1`. Auth: `Authorization: Bearer <supabase_jwt>` cho mọi route trừ mục đánh dấu **Public**.
> Response envelope chuẩn:
```json
{ "success": true, "data": { ... }, "error": null }
{ "success": false, "data": null, "error": { "code": "ERR_XXXX", "message": "..." } }
```

## 1. Auth Module (`/auth`)

| Method | Endpoint | Role | Mô tả |
|---|---|---|---|
| POST | `/auth/register` | Public | Đăng ký customer (`tenant_subdomain`, phone/email) — backend resolve tenant từ `tenant_subdomain`, tạo `customers` + `wallets` rỗng. Một Auth user chỉ thuộc một customer/tenant trong MVP |
| POST | `/auth/login` | Public | Đăng nhập, trả JWT (đã gắn custom claims theo `RLS_POLICIES.md`) |
| POST | `/auth/refresh` | Public | Làm mới access token |
| GET | `/auth/me` | Tất cả | Trả thông tin user hiện tại + `role_app`, `tenant_id`, `branch_id` |

## 2. Floor & Table Module (`/floors`, `/tables`)

| Method | Endpoint | Role | Mô tả |
|---|---|---|---|
| GET | `/floors?branch_id=` | OWNER, STAFF, CUSTOMER | Danh sách tầng của chi nhánh (CUSTOMER cần để chọn tầng trước khi xem sơ đồ bàn — xem `SPEC.md` Giai đoạn 2) |
| POST | `/floors` | OWNER | Tạo tầng mới (`floor_level`, `background_svg`) |
| GET | `/floors/:id/tables` | OWNER, STAFF, CUSTOMER | Lấy sơ đồ bàn (dùng cho Floor Editor và Live Floor Map) |
| POST | `/tables` | OWNER | Tạo bàn (`pos_x`, `pos_y`, `capacity`, `shape`) |
| PATCH | `/tables/:id` | OWNER | Cập nhật vị trí/kích thước bàn (kéo-thả trong Floor Editor) |
| PATCH | `/tables/:id/status` | STAFF | Đổi trạng thái thủ công (vd. `CLEANING` → `AVAILABLE`) — bắn `REALTIME_EVENTS.md#table_status_changed` |

## 3. Menu Management (`/categories`, `/products`)

> Module mới bổ sung — trước đây Owner chỉ có quyền đọc `products` dù `SPEC.md` xác định Owner có toàn quyền cấu hình thực đơn.

| Method | Endpoint | Role | Mô tả |
|---|---|---|---|
| GET | `/categories` | OWNER, STAFF, CUSTOMER | Danh sách danh mục món (dùng cho Menu & Giỏ hàng của Customer, và filter theo `kitchen_station` ở POS) |
| POST | `/categories` | OWNER | Tạo danh mục (`name`, `kitchen_station`: `BAR`\|`KITCHEN`) |
| PATCH | `/categories/:id` | OWNER | Sửa danh mục |
| DELETE | `/categories/:id` | OWNER | Xóa danh mục — lỗi `ERR_7003_CATEGORY_HAS_PRODUCTS` nếu còn `products.is_active = true` thuộc danh mục |
| GET | `/products?category_id=` | OWNER, STAFF, CUSTOMER | Danh sách món (CUSTOMER chỉ thấy `is_active = true`) |
| POST | `/products` | OWNER | Tạo món (`name`, `price`, `category_id`, `default_modifiers`) |
| PATCH | `/products/:id` | OWNER | Sửa món (giá, tên, `default_modifiers`, `is_active`) |
| DELETE | `/products/:id` | OWNER | Vô hiệu hóa món (soft-delete qua `is_active = false` — không xóa cứng vì `order_items` đã tham chiếu `product_id`) |

## 4. Staff Management (`/staff`)

> Module mới bổ sung — `SPEC.md` xác định Owner có quyền "phân quyền nhân sự" nhưng trước đây chưa có endpoint nào cho việc này (tài khoản STAFF/SUPPORT chỉ được tạo qua seed data).

| Method | Endpoint | Role | Mô tả |
|---|---|---|---|
| GET | `/staff?branch_id=` | OWNER | Danh sách nhân viên (`users` với `role IN ('STAFF','SUPPORT')`) của chi nhánh |
| POST | `/staff` | OWNER | Tạo tài khoản STAFF/SUPPORT (`email`, `full_name`, `phone`, `role`, `branch_id`). Backend tạo/invite Supabase Auth user và tự sinh `auth_user_id`; không nhận `auth_user_id` từ client. Lỗi `ERR_8002_STAFF_PHONE_EXISTS` nếu trùng số điện thoại trong tenant |
| PATCH | `/staff/:id` | OWNER | Sửa thông tin / đổi `branch_id` / đổi `role` của nhân viên; không được sửa `auth_user_id` |
| PATCH | `/staff/:id/deactivate` | OWNER | Đặt `users.is_active = false`, revoke phiên đăng nhập nếu có. Lỗi `ERR_8003_CANNOT_DEACTIVATE_LAST_OWNER` nếu đây là OWNER cuối cùng của tenant |

## 5. Reservation & Payment Module (`/reservations`)

| Method | Endpoint | Role | Mô tả |
|---|---|---|---|
| POST | `/reservations/lock` | CUSTOMER | Khóa tạm bàn 10 phút bằng Redis `SET NX EX` với token sở hữu, đồng thời chuyển bàn `AVAILABLE → PENDING_LOCK`; trả `reservation_code` dạng `RES_XXXXX`. Lỗi `ERR_2002_TABLE_LOCKED` nếu đã bị khóa |
| POST | `/reservations/:code/generate-qr` | CUSTOMER | Sinh chuỗi VietQR chứa `reservation_code` + số tiền cọc |
| POST | `/reservations/webhook/mock-payment` | Public (mock) | Chỉ dùng demo; phải có rate limit và mock signature/secret ở server. Tạo `payment_transactions`, đối chiếu `reservation_code` → nếu khớp: `tables.status = RESERVED`, giải phóng lock, bắn `table_status_changed`; nếu không khớp nội dung: tạo `unmatched_transactions` (`ERR_3002_PAYMENT_CONTENT_MISMATCH`) |
| DELETE | `/reservations/:code` | CUSTOMER | Chỉ chủ token được hủy đặt bàn trước khi thanh toán; giải phóng lock bằng compare-and-delete, chuyển `PENDING_LOCK → AVAILABLE` |

## 6. Order / POS Module (`/orders`)

| Method | Endpoint | Role | Mô tả |
|---|---|---|---|
| POST | `/orders` | STAFF | Tạo order mới khi check-in bàn (`table_id`), set `tables.status = OCCUPIED` |
| POST | `/orders/:id/items` | STAFF, CUSTOMER | Thêm món trực tiếp vào order (order đơn, không qua session nhóm). **Không dùng cho Group-Order** — luồng gọi món nhóm đi qua Redis session ở mục 7 (`/group-order/*`) và chỉ ghi vào `order_items` thật khi gọi `/group-order/:tableId/confirm` |
| PATCH | `/orders/:id/items/:itemId` | STAFF, CUSTOMER | Sửa số lượng/modifier trước khi gửi bếp |
| POST | `/orders/:id/submit-kitchen` | STAFF | Chốt gửi bếp — tách theo `categories.kitchen_station`, bắn `kds_new_ticket` |
| PATCH | `/orders/:id/items/:itemId/kitchen-status` | STAFF | Cập nhật `QUEUED → PREPARING → READY → SERVED`, bắn `kds_item_status_changed` |
| POST | `/orders/:id/pay` | STAFF, CUSTOMER | Thanh toán (`payment_method`: `VIETQR`\|`WALLET`\|`COFFEE_PASS`) trong transaction/idempotency boundary → set `status = COMPLETED` → trigger DB tự cập nhật CDP. Với `WALLET`: khóa row ví, trừ `promo_balance` trước, phần còn thiếu trừ tiếp vào `main_balance`; ghi 1 dòng `wallet_transactions` cho mỗi `balance_type` bị trừ |
| GET | `/orders/:id` | STAFF, CUSTOMER, OWNER | Chi tiết order |

## 7. Group-Order Session (`/group-order`) — dùng Redis (không qua Postgres)

| Method | Endpoint | Role | Mô tả |
|---|---|---|---|
| POST | `/group-order/join` | CUSTOMER | Quét QR tĩnh tại bàn; backend kiểm tra bàn thuộc tenant và đang `OCCUPIED`, sau đó tham gia session Redis `session:{tenant_id}:{table_id}` |
| GET | `/group-order/:tableId/cart` | CUSTOMER | Lấy giỏ hàng chung hiện tại (Redis) |
| POST | `/group-order/:tableId/cart/items` | CUSTOMER | Thêm món vào giỏ chung → bắn realtime cho các thiết bị khác trong session |
| POST | `/group-order/:tableId/confirm` | CUSTOMER, STAFF | Chốt giỏ hàng chung → tra `order_id` từ `tables.current_order_id` (bàn phải đang `OCCUPIED` với order mở sẵn từ bước check-in) → ghi giỏ hàng Redis vào `order_items` thật, gọi `/orders/:id/submit-kitchen` |

## 8. Wallet & Coffee Pass (`/wallet`, `/coffee-pass`)

| Method | Endpoint | Role | Mô tả |
|---|---|---|---|
| GET | `/wallet` | CUSTOMER | Số dư `main_balance` / `promo_balance` |
| POST | `/wallet/topup` | CUSTOMER | Nạp ví (mock VietQR), ghi `wallet_transactions type=TOPUP` |
| GET | `/wallet/transactions` | CUSTOMER | Lịch sử `wallet_transactions` (`TOPUP`, `PAYMENT`, `REFUND`, `PROMO_CREDIT`), phân trang |
| GET | `/wallet/vouchers` | CUSTOMER | Danh sách `customer_vouchers` của khách (ưu tiên `is_used = false` và chưa hết hạn) — nơi khách xem voucher do `POST /cdp/customers/:id/vouchers` hoặc `POST /support/tickets/:id/resolve` phát ra |
| GET | `/coffee-pass/plans` | CUSTOMER | Danh sách gói Coffee Pass khả dụng của tenant (`coffee_pass_plans`) — dùng để chọn `plan_id` trước khi `subscribe` |
| POST | `/coffee-pass/subscribe` | CUSTOMER | Mua gói (`plan_id` lấy từ `GET /coffee-pass/plans`), sinh `totp_secret` |
| GET | `/coffee-pass/:id/current-code` | CUSTOMER | Trả mã TOTP hiện tại (xoay 30s) để hiển thị QR |
| POST | `/coffee-pass/:id/redeem` | STAFF | Staff quét mã, xác thực TOTP, trừ `remaining_redemptions` |

## 9. CDP / Loyalty & Reporting (`/cdp`, `/reports`)

| Method | Endpoint | Role | Mô tả |
|---|---|---|---|
| GET | `/cdp/customers?segment=` | OWNER, SUPPORT | Danh sách khách theo phân khúc RFM (`VIP`, `LOYAL`, `CHURN_RISK`, `NEW`) — SUPPORT cần quyền đọc để xác định khách cần chăm sóc trước khi gọi `POST /cdp/customers/:id/vouchers` |
| GET | `/cdp/customers/:id/360` | OWNER, SUPPORT | Hồ sơ 360: chi tiêu, hạng, món khoái khẩu, ghi chú dị ứng |
| GET | `/reports/dashboard?branch_id=` | OWNER | Doanh thu tức thì, tỷ lệ lấp đầy bàn, top món bán chạy |
| POST | `/cdp/customers/:id/vouchers` | OWNER, SUPPORT | Phát voucher tái kích hoạt cho khách nhóm Churn Risk |

## 10. Support / CSKH Module (`/support`)

| Method | Endpoint | Role | Mô tả |
|---|---|---|---|
| POST | `/support/csat` | CUSTOMER | Gửi đánh giá trải nghiệm (`order_id`, `score` 1-5, `complaint_note`) sau khi thanh toán — tạo `support_tickets`; nếu `score <= 2` set `priority = URGENT` và bắn `support_ticket_urgent_created`. Lỗi `ERR_6005_CSAT_ALREADY_SUBMITTED` nếu order đã có ticket CSAT |
| GET | `/support/unmatched` | SUPPORT | Hàng đợi giao dịch lỗi (`unmatched_transactions.status = PENDING`) |
| GET | `/support/unmatched/:id/suggest` | SUPPORT | Gọi `fn_suggest_customer_match` (xem `ERD.md` mục 3.2), trả top 5 khách khớp nhất |
| POST | `/support/unmatched/:id/propose` | SUPPORT (Maker) | Tạo đề xuất khớp khách, set `status = PROPOSED`, ghi `maker_user_id` |
| POST | `/support/unmatched/:id/approve` | SUPPORT/OWNER (Checker) | Duyệt đề xuất → tạo `wallet_transactions`/cập nhật `orders`, ghi `audit_logs`, set `status = APPROVED`. Lỗi `ERR_6002_SELF_APPROVAL` nếu `checker_user_id == maker_user_id` |
| GET | `/support/tickets` | SUPPORT | Danh sách ticket CSAT (ưu tiên `priority = URGENT`) |
| POST | `/support/tickets/:id/resolve` | SUPPORT | Đóng ticket, có thể kèm phát `customer_vouchers` |
| POST | `/support/customers/merge` | SUPPORT | Gọi `fn_merge_customer_profiles(source_id, target_id)` (xem `ERD.md` mục 3.3). Lỗi `ERR_6004_MERGE_SAME_CUSTOMER` nếu `source_id = target_id` |

## 11. Quy ước chung

- Phân trang: `?page=1&limit=20`, response có thêm `meta: { total, page, limit }`
- Toàn bộ endpoint ghi dữ liệu tài chính (`/orders/:id/pay`, `/support/unmatched/:id/approve`, `/wallet/topup`) phải ghi `audit_logs` — xem `ERD.md`
- Validate DTO bằng `class-validator` (NestJS) — quy ước đặt tên DTO tại `CODING_CONVENTION.md`
