# B2 Backend Final Handover

## 1. Scope

Backend Dev 2 (B2) chịu trách nhiệm phát triển các tính năng mở rộng (B2 features) trên nền tảng Backend Dev 1 (B1) đã xây dựng, bao gồm:
- Đặt bàn (Reservation) và Mock Payment.
- Order, KDS (Kitchen Display System), và POS API.
- Group Order (Đặt món theo nhóm) sử dụng Redis session.
- Wallet (Ví điện tử trả trước) và tích hợp thanh toán.
- Coffee Pass (Gói đăng ký tháng/tuần với cơ chế đổi mã qua TOTP).
- Support / CSKH (Đánh giá CSAT, xử lý vé khiếu nại, đối soát giao dịch unmatched, merge khách hàng).

B2 sử dụng chung cơ sở hạ tầng (infrastructure) của B1 bao gồm: SupabaseService, RedisService, Các Guards (SupabaseAuthGuard, TenantGuard, RolesGuard), và hệ thống Error Codes.

## 2. Implemented Modules

### Reservation
- **Purpose**: Quản lý đặt bàn trước, sinh mã QR thanh toán (mock), và webhook nhận kết quả thanh toán. Sử dụng Redis để chống race-condition khi lock bàn.
- **Endpoints**:
  - `POST /reservations/lock`: Giữ chỗ tạm thời (TTL 10 phút trên Redis).
  - `POST /reservations/:code/generate-qr`: Sinh QR thanh toán.
  - `POST /reservations/webhook/mock-payment`: Webhook (@Public) nhận callback thanh toán.
  - `DELETE /reservations/:code`: Huỷ đặt bàn.
- **Major business rules**: Dùng Redis `SET NX EX` 600s để lock bàn. Chuyển trạng thái bàn sang RESERVED khi thanh toán khớp (matched). Nếu không khớp (unmatched), đẩy vào queue Support.
- **Dependencies**: `SupabaseService`, `RedisService`.
- **Error handling**: Bắt các lỗi bàn đã lock (`ERR_2002_TABLE_LOCKED`), hết hạn (`ERR_3001_RESERVATION_EXPIRED`), webhook sai lệch (`ERR_3002_PAYMENT_CONTENT_MISMATCH`).

### Order / POS
- **Purpose**: Tạo order, thêm món, cập nhật món, đẩy món xuống bếp, cập nhật trạng thái bếp và thanh toán.
- **Endpoints**:
  - `POST /orders`: Tạo order mới.
  - `POST /orders/:id/items`: Thêm món.
  - `PATCH /orders/:id/items/:itemId`: Sửa món.
  - `POST /orders/:id/submit-kitchen`: Báo bếp.
  - `PATCH /orders/:id/items/:itemId/kitchen-status`: Bếp cập nhật trạng thái.
  - `POST /orders/:id/pay`: Thanh toán order (tiền mặt/ví).
  - `GET /orders/:id`: Lấy chi tiết order.
- **Major business rules**: Chỉ món ở trạng thái `QUEUED` mới được phép update/xóa. Sau khi báo bếp, phát event KDS. Thanh toán qua ví (Wallet) sẽ tự động trừ balance.
- **Dependencies**: `RealtimeGateway`, `WalletService`.
- **Error handling**: Bắt lỗi order hoàn tất không cho sửa (`ERR_4002_ORDER_ALREADY_COMPLETED`), submit giỏ hàng rỗng (`ERR_4003_EMPTY_ORDER_SUBMIT`).

### KDS Realtime
- **Purpose**: Phát realtime event xuống bếp và nhận cập nhật từ bếp lên POS/khách.
- **Endpoints**: (Thông qua WebSocket `RealtimeGateway`).
- **Major business rules**: Room isolation theo `kds:{branch_id}`. Các event: `kds_new_ticket` (khi submit-kitchen) và `kds_item_status_changed`.
- **Dependencies**: `@nestjs/websockets`, `socket.io`.
- **Error handling**: Ngắt kết nối nếu JWT invalid.

### Group Order
- **Purpose**: Cho phép nhiều khách cùng chung một giỏ hàng tạm (session) trước khi đẩy thành order chính thức.
- **Endpoints**:
  - `POST /group-order/join`: Khách tham gia session.
  - `GET /group-order/:tableId/cart`: Xem giỏ.
  - `POST /group-order/:tableId/cart/items`: Cập nhật giỏ.
  - `POST /group-order/:tableId/confirm`: Chốt đơn.
- **Major business rules**: Lưu session giỏ hàng trong Redis (TTL 2h). Sử dụng cơ chế Optimistic Locking (Redis `WATCH` / `MULTI`) để chống conflict khi nhiều người thêm món.
- **Dependencies**: `RedisService`, `RealtimeGateway`, `OrderService`.
- **Error handling**: Phiên đã chốt không thể thêm (`ERR_5002_SESSION_ALREADY_CONFIRMED`). Cập nhật giỏ sinh ra event `group_order_cart_updated`.

### Wallet
- **Purpose**: Quản lý ví điện tử, top-up, lịch sử giao dịch và logic ưu tiên trừ tiền.
- **Endpoints**:
  - `GET /wallet`: Xem ví.
  - `POST /wallet/topup`: Nạp tiền.
  - `GET /wallet/transactions`: Lịch sử giao dịch.
  - `GET /wallet/vouchers`: Danh sách voucher.
- **Major business rules**: Trừ tiền theo thứ tự `promo_balance` trước, `main_balance` sau. Sử dụng optimistic locking (`UPDATE ... WHERE main_balance = old_value`) để ngăn concurrent topup.
- **Dependencies**: `SupabaseService`.
- **Error handling**: Bắt lỗi không đủ số dư (`ERR_3003_INSUFFICIENT_WALLET_BALANCE`).

### Coffee Pass
- **Purpose**: Bán gói đăng ký đồ uống theo chu kỳ, đổi mã sử dụng TOTP để chống gian lận.
- **Endpoints**:
  - `GET /coffee-pass/plans`: Xem gói.
  - `POST /coffee-pass/subscribe`: Đăng ký.
  - `GET /coffee-pass/:id/current-code`: Sinh TOTP lấy mã.
  - `POST /coffee-pass/:id/redeem`: Quẹt mã.
- **Major business rules**: TOTP với window 30 giây (epoch step). Trừ trực tiếp tiền từ Wallet (`WalletService.debit`) khi đăng ký.
- **Dependencies**: `WalletService`, `otplib`.
- **Error handling**: Bắt mã sai/hết hạn (`ERR_3005_INVALID_TOTP_CODE`), hết lượt dùng, gói hết hạn (`ERR_3004_COFFEE_PASS_EXPIRED`).

### Support / CSKH
- **Purpose**: Đánh giá dịch vụ (CSAT), xử lý khiếu nại (Maker-Checker), đối soát thủ công các khoản thanh toán chưa khớp (unmatched).
- **Endpoints**:
  - `POST /support/csat`: Đánh giá order.
  - `GET /support/unmatched`: Xem unmatched transactions.
  - `GET /support/unmatched/:id/suggest`: Gợi ý order (fuzzy match).
  - `POST /support/unmatched/:id/propose`: Maker đề xuất đối soát.
  - `POST /support/unmatched/:id/approve`: Checker duyệt đối soát.
  - `GET /support/tickets`: Danh sách khiếu nại.
  - `POST /support/tickets/:id/resolve`: Đóng vé.
  - `POST /support/customers/merge`: Hợp nhất 2 khách.
- **Major business rules**: Điểm CSAT <= 2 tạo vé `URGENT` và emit realtime. Maker-Checker cho việc đối soát: người đề xuất (propose) không được tự duyệt (approve). Fuzzy match tìm đơn theo số tiền và thời gian. 
- **Dependencies**: `RealtimeGateway`, `SupabaseService`.
- **Error handling**: Cấm tự duyệt (`ERR_6002_SELF_APPROVAL`), cấm gộp trùng khách (`ERR_6004_MERGE_SAME_CUSTOMER`).

## 3. API Endpoints

| Module | Method | Endpoint | Status |
|---|---|---|---|
| Reservation | POST | `/reservations/lock` | PASS |
| Reservation | POST | `/reservations/:code/generate-qr` | PASS |
| Reservation | POST | `/reservations/webhook/mock-payment` | PASS |
| Reservation | DELETE | `/reservations/:code` | PASS |
| Order | POST | `/orders` | PASS |
| Order | POST | `/orders/:id/items` | PASS |
| Order | PATCH | `/orders/:id/items/:itemId` | PASS |
| Order | POST | `/orders/:id/submit-kitchen` | PASS |
| Order | PATCH | `/orders/:id/items/:itemId/kitchen-status` | PASS |
| Order | POST | `/orders/:id/pay` | PASS |
| Order | GET | `/orders/:id` | PASS |
| Group Order | POST | `/group-order/join` | PASS |
| Group Order | GET | `/group-order/:tableId/cart` | PASS |
| Group Order | POST | `/group-order/:tableId/cart/items` | PASS |
| Group Order | POST | `/group-order/:tableId/confirm` | PASS |
| Wallet | GET | `/wallet` | PASS |
| Wallet | POST | `/wallet/topup` | PASS |
| Wallet | GET | `/wallet/transactions` | PASS |
| Wallet | GET | `/wallet/vouchers` | PASS |
| Coffee Pass | GET | `/coffee-pass/plans` | PASS |
| Coffee Pass | POST | `/coffee-pass/subscribe` | PASS |
| Coffee Pass | GET | `/coffee-pass/:id/current-code` | PASS |
| Coffee Pass | POST | `/coffee-pass/:id/redeem` | PASS |
| Support | POST | `/support/csat` | PASS |
| Support | GET | `/support/unmatched` | PASS |
| Support | GET | `/support/unmatched/:id/suggest` | PASS |
| Support | POST | `/support/unmatched/:id/propose` | PASS |
| Support | POST | `/support/unmatched/:id/approve` | PASS |
| Support | GET | `/support/tickets` | PASS |
| Support | POST | `/support/tickets/:id/resolve` | PASS |
| Support | POST | `/support/customers/merge` | PASS |

## 4. Redis Architecture

- **Reservation lock**: Dùng khoá `lock:{tenant_id}:{table_id}`.
- **TTL**: 600s (10 phút) cho lock, sau đó tự huỷ.
- **Ownership token**: Value của khoá chứa JSON bao gồm thông tin session/code để verify.
- **Compare-and-delete**: (Chưa triển khai atomic Lua script, chỉ xoá theo code sinh ra do đặc thù 1 session = 1 khoá riêng).
- **Group Order session**: `session:{tenant_id}:{table_id}` chứa danh sách món. TTL 7200s (2h).
- **Redis key strategy**: Prefix theo module, cô lập theo `tenant_id` tránh collision.
- **Concurrency strategy**: Dùng `WATCH` và `MULTI` (optimistic locking) trong thao tác Group Order cart để tránh dirty writes nếu 2 user cùng add item.

## 5. Realtime Architecture

- **Socket.IO Gateway**: Chạy tại `RealtimeGateway`, lắng nghe trên các module liên quan.
- **Authentication strategy**: Dùng JWT từ Supabase. Verify bằng `jose` và JWKS trước khi cho connect.
- **Room isolation**: Tham gia room theo `tenant_id` hoặc `branch_id` (`kds:{branch_id}`, `support:{tenant_id}`).
- **Event names**:
  - `kds_new_ticket`
  - `kds_item_status_changed`
  - `group_order_cart_updated`
  - `support_ticket_urgent_created`

## 6. Reservation / Payment Mock Flow

1. **Table lock**: Khách gửi request gọi bàn, tạo khoá tạm trên Redis.
2. **Reservation**: Ghi xuống bảng `reservations` trạng thái `PENDING`.
3. **QR**: Sinh thông tin QR/chuyển khoản (Mock text/image payload).
4. **Mock webhook**: Nhận POST request giả lập ngân hàng.
5. **Matched/Unmatched transaction**: Kiểm tra theo `reservation_code` và số tiền. Nếu khớp → thanh toán thành công (MATCHED). Nếu không khớp (sai số tiền/code/quá hạn) → UNMATCHED queue.
6. **Cancel/Expiry**: Người dùng huỷ hoặc Redis expire thì xoá.

## 7. Order / POS / KDS Flow

1. **Create**: Bồi bàn/khách tạo order (bản nháp).
2. **Items**: Thêm sửa món (`QUEUED`).
3. **Submit kitchen**: Chốt danh sách đẩy xuống KDS.
4. **KDS**: KDS nhận tín hiệu qua Socket (`kds_new_ticket`).
5. **Kitchen status**: Bếp đổi sang `PREPARING`, `READY` (emit update).
6. **Payment**: Thu ngân/khách bấm pay, trừ tiền ví hoặc thanh toán mặt.
7. **Completion**: Đơn sang `COMPLETED`, không thể update món nữa.

## 8. Wallet

- **Balance**: Chia làm `promo_balance` (khuyến mãi) và `main_balance` (tiền nạp thật).
- **Topup**: Nạp tiền tăng `main_balance`, tạo giao dịch.
- **Transactions**: Lưu vết +/-.
- **Vouchers**: Tính năng quà tặng ví.
- **PROMO before MAIN**: Khi trừ tiền, luôn ưu tiên cấn trừ từ `promo_balance` cho tới khi hết mới trừ tới `main_balance`.
- **Order integration**: Module Order gọi `walletService.debit` trong một unit công việc để trừ tiền khi thanh toán order bằng ví.
- **Concurrency limitation**: Cập nhật balance dùng `WHERE balance = old_value` chống race, nhưng giao dịch thanh toán Order vẫn chưa gói trong 1 Transaction atomic cấp database (có risk).

## 9. Coffee Pass

- **Plans**: Lấy gói định kỳ sẵn có.
- **Subscription**: Cấn trừ ví khách, tạo `coffee_pass_subscriptions`.
- **TOTP**: Sử dụng HMAC-based One Time Password, thuật toán SHA-1 tiêu chuẩn.
- **30s rotation**: Dựa trên unix epoch chia 30, mỗi 30s mã số sẽ thay đổi.
- **Redeem**: Dùng nhân viên quét mã của khách.
- **Expiration / remaining_redemptions**: Trừ lượt, báo lỗi nếu dùng hết.
- **Wallet/Order integration**: Đăng ký trừ tiền Wallet, Đổi nước liên kết trực tiếp (không sinh order đầy đủ nhưng tuỳ luồng có thể sinh tuỳ quán). Không log secret TOTP ra terminal.

## 10. Support / Maker-Checker

- **CSAT**: Ghi nhận rate (1-5 sao).
- **Urgent support ticket**: Rate <= 2 tự kích hoạt vé Support, emit realtime thông báo chủ/CSKH.
- **Unmatched transactions**: Lưu tiền vào nhưng không khớp đơn (treo).
- **Fuzzy matching**: Thuật toán tìm đơn trong ±2 tiếng với sai số tiền ±20%.
- **Maker-Checker**: CSKH (Maker) đề xuất khớp đơn. Quản lý (Checker) duyệt.
- **Self approval prevention**: Maker-Checker phải là 2 ID khác nhau, báo lỗi `ERR_6002_SELF_APPROVAL` nếu cố duyệt vé của mình.
- **Customer merge**: Gom 2 ID khách hàng khi phát hiện clone profile (Sử dụng DB Function B1 RPC).
- **Resolution**: Chốt vé khiếu nại (Đóng vé).

## 11. Security

- **JWT**: Sử dụng Bearer token cấp từ Supabase.
- **TenantGuard, RolesGuard**: Filter truy cập cấp controller/route (thứ tự chặt chẽ: xác minh Auth → check Cấu trúc Tenant → check Role).
- **RLS**: Mọi DB query qua SupabaseService đều attach `Authorization: Bearer <token>` để DB Engine tự ép Policy RLS (chống lọt data).
- **Server-side tenant/branch identity**: Lấy thông tin role/branch từ `CurrentUser()` (decode từ claim JWT hook) không tin payload Client gửi.
- **Realtime room isolation**: Xác thực JWT trước, bắt client join đúng room `tenant_id` của họ, emit chỉ đích danh room.
- **TOTP secret handling**: Không lộ key sinh ra, chỉ trả qua TLS vào lúc generate (không public lại), client giữ key trong app.

## 12. Audit Logging

- B2 có sử dụng `supabaseAdmin` để lưu log thông qua hàm `audit_logs`.
- Các Action thực sự có log: 
  - `WALLET_TOPUP`
  - `COFFEE_PASS_SUBSCRIBE`
  - `UNMATCHED_APPROVED`

## 13. Environment Variables

Các biến cần để backend vận hành (được cấu hình qua `ConfigModule` và `package.json` setup):
- `PORT` (Tuỳ chọn)
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_ISSUER`
- `REDIS_URL`
- `MOCK_PAYMENT_SECRET`

## 14. Dependencies

Các library thuộc phạm vi B2 (được ghi nhận trong `package.json`):
- `ioredis`
- `socket.io`
- `@nestjs/websockets`
- `@nestjs/platform-socket.io`
- `jose` (JWT verification)
- `otplib` (TOTP generation/validation)
- `qrcode` / `@types/qrcode` (Mã QR)

## 15. Build

`npm run build` thực tế: **PASS**

## 16. Tests

### Actually executed
- Unit tests (`vitest run`): `src/modules/support/support.spec.ts` (18/18 tests Passed).
- Phạm vi test: CSAT Priority Logic, Wallet Debit Strategy, Maker-Checker Self-Approval Prevention, Coffee Pass TOTP Window Calculation, Reservation Code Format, Merge Same Customer Validation, Group Order Confirm-twice Prevention.

### Not executed
- E2E Tests.

### Reason
- Thiếu hạ tầng test cục bộ. Supabase cloud và Redis server không có sẵn dữ liệu test (test data/env) và không thể hardcode chạy trong script CI đơn thuần (Đòi hỏi seed database/Supabase docker).

## 17. Known Limitations / Risks

- **Financial atomicity**: Không có DB transaction (như `BEGIN...COMMIT`) bao trùm được giữa cập nhật `orders` và `wallet_balances` (do hạn chế Supabase REST API không wrap RPC cross-table). Có risk nhỏ lệch số liệu nếu server crash giữa 2 dòng code.
- **TOTP replay protection**: Thuật toán TOTP có window 30s. Hiện chưa có cơ chế cấm "một mã xài lại 2 lần trong cùng window". (Nếu client chớp nhoáng gửi request song song). Cần xử lý Redis cache mã đã dùng với TTL 60s nếu là lỗ hổng ưu tiên.
- **Realtime room `group_order`**: WebSocket room isolation đang yêu cầu client phải emit 1 custom event `join_group_order` (FE xử lý) thì mới vào phòng được. Client không tự auto join room lúc connect được vì chưa biết `table_id`.
- **Mock Payment Unmatched Tenant**: Bảng `unmatched_transactions` webhook sinh ra nhưng không biết `tenant_id` do payload từ bank chuyển lên không chứa header của cửa hàng.
- **Duplicate `@UseGuards`**: Một vài Controller của B2 đang gắn dư `@UseGuards(SupabaseAuthGuard...)` trong khi hệ thống B1 đã cài GlobalGuard. Code chạy đúng nhưng dư thừa logic (chạy 2 lần).
- **E2E chưa chạy**: Vì thiếu môi trường thật (DB/Redis) → các behavior tích hợp dài hạn vẫn tồn tại risk khi ghép nối FE/App.

## 18. Database Changes Requested From B1

- Cần 1 hàm RPC (Database Function) `fn_pay_order(order_id, payment_method, customer_sub, ...)` từ team B1 để gói gọn logic trừ Wallet Balance và cập nhật Order Status vào trong một SQL Transaction (giải quyết triệt để rủi ro Atomicity đề cập ở mục 17). 
- Hiện tại không tự sửa trong Phase 9.

## 19. How To Run

Khởi động dự án:

```bash
cd apps/api
npm install
npm run build
npm run start:dev
```

**Yêu cầu hạ tầng**:
1. Supabase Project chạy sẵn (Local Docker hoặc Cloud) với đầy đủ cấu trúc Bảng/Migrations của B1.
2. Redis Server (Local hoặc URL).
3. Biến môi trường điền đúng vào `.env`.

## 20. Demo Scenarios

1. **Reservation**: Đăng nhập bằng KH. Gọi `/reservations/lock` → ra mã QR → Giả lập gọi Webhook `/mock-payment` với đúng số tiền & QR Text → Đơn chuyển sang `RESERVED`.
2. **Order/KDS**: Thu ngân tạo `/orders` → Khách thêm món `QUEUED` → Khách chốt `submit-kitchen` → Socket server bắn tín hiệu cờ lệnh về cho Tablet Bếp.
3. **Group Order**: Khách quét mã QR trên bàn, POST `/group-order/join` (join bằng User Session). Khách 1 thêm Món A. Khách 2 tự thấy món qua Socket. Khách 2 thêm Món B. Khách 1 bấm Chốt. Món đẩy xuống Bếp.
4. **Wallet**: Nạp 50k vào ví (Topup). Đặt ly nước 45k. Bấm thanh toán ví. Hệ thống tự trừ tiền và lưu lịch sử giao dịch `/transactions`.
5. **Coffee Pass**: Khách mua gói (trừ tiền ví). Tới quán mở app, sinh Code (Current-Code) TOTP trong 30s. Nhân viên nhập `/redeem`. Trừ 1 lượt của KH.
6. **Support**: Giao dịch Webhook Reservation thất bại đẩy vào `unmatched`. Maker thấy, xem gợi ý `suggest`, tìm thấy Đơn Khách. Gửi `propose`. Quản lý (Checker) đăng nhập xem `approve`.
