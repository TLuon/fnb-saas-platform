# TASK_ASSIGNMENT.md — Phân Công Nhóm 4 Người (Bản Gốc — Chia Theo Vai Trò)

> **Cập nhật:** nhóm đã đổi cách chia người thực tế sang **2 nửa FE/BE** (1 DB Lead dùng chung cho cả team) — xem `PLAN_BE.md` và `PLAN_FE.md` để biết ai làm gì. File này **vẫn giữ giá trị tham chiếu** cho việc *module nào thuộc nghiệp vụ nào* (dùng khi đọc `API_CONTRACT.md`/`REALTIME_EVENTS.md`), không còn dùng để phân người trực tiếp.

> Nguyên tắc phân công (bản gốc, nay chỉ mang tính tham chiếu nghiệp vụ): mỗi "vai trò" dưới đây tương ứng 1 nhóm module trọn vẹn (từ DB liên quan → API → giao diện tương ứng) theo đúng 4 vai trò định nghĩa tại `SPEC.md` mục 2.

## Tổng quan theo vai trò nghiệp vụ

| Vai trò nghiệp vụ | Module backend (`API_CONTRACT.md`) | Giao diện (FE) |
|---|---|---|
| Owner/Manager | Floor & Table, CDP/Reporting | Staff Dashboard: Floor Editor, Analytics Dashboard |
| Staff/Cashier | Order/POS, KDS status | Staff Dashboard: Live Floor Map, POS Order Screen, KDS |
| Customer | Reservation & Payment, Group-Order, Wallet & Coffee Pass | Customer PWA: toàn bộ |
| Support/CSKH | Support Module (Maker-Checker, Ticket) | Staff Dashboard: Support Board |

## Chi tiết theo vai trò

### Vai trò: Owner/Manager
**Bảng DB sở hữu chính:** `branches`, `floors`, `tables`, `categories`, `products`, `users` (STAFF/SUPPORT), CDP-related fields của `customers`
**Việc cần làm:**
1. Floor Editor: CRUD tầng/bàn, kéo-thả tọa độ (`pos_x`, `pos_y`) trên Canvas/SVG
2. Menu Management: CRUD `categories` + `products` (giá, `kitchen_station`, `default_modifiers`, `is_active`) — xem `API_CONTRACT.md` mục 3
3. Staff Management: tạo/sửa/vô hiệu hóa tài khoản STAFF/SUPPORT, phân quyền branch — xem `API_CONTRACT.md` mục 4
4. Analytics Dashboard: doanh thu, tỷ lệ lấp đầy bàn, top món bán chạy (`GET /reports/dashboard`)
5. CDP: danh sách khách theo phân khúc RFM, hồ sơ 360 (`GET /cdp/customers/:id/360`)
6. Viết trigger `trg_order_completed` + function RFM segmentation (phối hợp với người phụ trách Order vì trigger nằm trên bảng `orders`)

### Vai trò: Staff/Cashier
**Bảng DB sở hữu chính:** `orders`, `order_items`, `payment_transactions` (tạo lúc thanh toán tại quầy)
**Việc cần làm:**
1. Live Floor Map: hiển thị màu trạng thái bàn realtime (subscribe kênh `tables:{branch_id}`)
2. POS: tạo order, thêm món, gửi bếp, thanh toán (`/orders/*`)
3. KDS: 2 màn hình (Bar/Kitchen) subscribe kênh `kds:{branch_id}`
4. Coffee Pass — vế Staff: quét mã, xác thực TOTP, trừ `remaining_redemptions` (`POST /coffee-pass/:id/redeem`). **Lưu ý:** vế mua gói/hiển thị mã TOTP thuộc Customer — Staff chỉ chịu trách nhiệm bước redeem tại quầy
5. Phối hợp với người phụ trách CDP cho phần trigger vì nằm trên bảng `orders` mà route `POST /orders/:id/pay` gọi tới

### Vai trò: Customer
**Bảng DB sở hữu chính:** `customers`, `wallets`, `wallet_transactions`, `coffee_pass_subscriptions`, phần ghi (Redis) của Group-Order
**Việc cần làm:**
1. Đặt bàn trực quan: xem sơ đồ 2D (đọc API Floor & Table), khóa bàn, sinh mã VietQR mock
2. Group-Order: thiết kế session Redis, API `/group-order/*`, đồng bộ giỏ hàng chung
3. Ví trả trước + Coffee Pass — vế Customer: mua gói, xem số dư/lịch sử ví, hiển thị mã TOTP xoay 30s (`GET /coffee-pass/:id/current-code`). Vế redeem tại quầy thuộc Staff (xem mục Staff/Cashier)
4. Toàn bộ Customer PWA (Next.js)

### Vai trò: Support/CSKH
**Bảng DB sở hữu chính:** `unmatched_transactions`, `support_tickets`, `audit_logs`, `customer_vouchers`
**Việc cần làm:**
1. Hàng đợi tra soát: `GET /support/unmatched`, tích hợp `fn_suggest_customer_match` (pg_trgm)
2. Maker-Checker: `POST /support/unmatched/:id/propose` và `/approve`, đảm bảo chặn `ERR_6002_SELF_APPROVAL`
3. Closed-loop CSAT: nhận `support_ticket_urgent_created`, xử lý ticket, phát voucher đền bù
4. `fn_merge_customer_profiles` cho hồ sơ khách trùng lặp

## Điểm phụ thuộc chéo cần lưu ý (theo `REALTIME_EVENTS.md` mục 4)

- **A → B:** A dựng sơ đồ bàn trước, B cần API `GET /floors/:id/tables` sẵn để build Live Floor Map — A nên hoàn thành Floor CRUD (không cần UI đẹp) sớm nhất trong tuần đầu.
- **B → C:** C cần bảng `products`/`categories` (do A tạo) và cần order đã được B tạo (check-in) tồn tại trước khi Group-Order có `order_id` để ghi vào.
- **A & B → D:** D cần `orders`, `payment_transactions` đã có dữ liệu thật để test luồng tra soát — nên dùng seed data (`SETUP.md` mục 9) thay vì chờ A/B code xong.
- **Tất cả → CODING_CONVENTION.md:** thống nhất trước khi code, đặc biệt phần Guard/DTO/Response envelope, để tránh việc tích hợp cuối kỳ bị lệch format.

## Mốc kiểm tra chéo đề xuất (không phải lịch bắt buộc, nhóm tự điều chỉnh)

1. **Tuần 1-2:** Mỗi vai trò (A/B/C/D) chốt xong yêu cầu dữ liệu (bảng/cột cần cho module mình) và báo cho B1 — B1 là người **duy nhất** dựng DDL/migration (theo nguyên tắc "1 DB dùng chung" ở `PLAN_BE.md` mục 1); mỗi vai trò sau đó code CRUD cơ bản trên schema B1 đã tạo, seed data chạy được
2. **Tuần 3-4:** Realtime cơ bản chạy (A+B: table status; C: group-order)
3. **Tuần 5-6:** Luồng thanh toán mock + trigger CDP + module D hoàn chỉnh
4. **Tuần 7-8:** Tích hợp toàn bộ, test tay các race condition (`CODING_CONVENTION.md` mục 4), chuẩn bị demo
