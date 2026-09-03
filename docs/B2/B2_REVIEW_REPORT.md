# B2 Code Review Report

Tài liệu này tổng hợp các lỗi và vấn đề kiến trúc được phát hiện sau khi rà soát mã nguồn của thành viên B2 tại nhánh `bedev`.

## 1. Lỗi nghiêm trọng: Foreign Key Violation khi chốt Group Order
- **Module:** `Group Order`
- **Tập tin:** `backend/api/src/modules/group-order/group-order.service.ts`
- **Vấn đề:** 
  - Tại dòng 125 (khi add item vào cart), code gán `added_by_customer_id: user.sub` (`user.sub` là UUID từ `auth.users`).
  - Tại dòng 197 (khi confirm group order), giá trị này được insert thẳng vào cột `added_by_customer_id` của bảng `order_items`.
- **Hậu quả:** B2 đã quy định trong `order.service.ts` rằng cột này phải map với `customers.id`, không phải `auth.users.id`. Việc insert `auth_user_id` sẽ dẫn đến lỗi **Foreign Key Violation** ở cấp database, làm tính năng xác nhận đơn nhóm luôn bị crash.

## 2. Lỗi Logic: Frontend không thể tham gia Realtime Room của Group Order
- **Module:** `Realtime / KDS`
- **Tập tin:** `backend/api/src/common/realtime/realtime.gateway.ts`
- **Vấn đề:** 
  - Hàm `emitGroupOrderCartUpdated` bắn sự kiện vào room `group_order:{tenantId}:{tableId}`.
  - Tuy nhiên, trong `RealtimeGateway` không có bất kỳ bộ lắng nghe nào (ví dụ: `@SubscribeMessage('join_group_order')`) để xử lý việc Socket của client join vào room này.
- **Hậu quả:** FE không thể tự ý ép Server cho mình join vào room nếu Server không mở cổng. Do đó, các cập nhật realtime của Group Order sẽ không thể đến được với người dùng.

## 3. Rủi ro tài chính: Lỗi Atomicity khi thanh toán Wallet
- **Module:** `Order / Wallet`
- **Tập tin:** `backend/api/src/modules/order/order.service.ts` (Hàm `payOrder`)
- **Vấn đề:** 
  - Dòng 322: Gọi `walletService.payWithWallet(...)` để trừ số dư ví trong Database.
  - Dòng 331: Cập nhật trạng thái của bảng `orders` thành `COMPLETED`.
- **Hậu quả:** Do 2 thao tác này không được bọc trong một DB Transaction chung, nếu hệ thống xảy ra sự cố (crash, lỗi kết nối) giữa dòng 322 và 331, ví khách hàng sẽ bị trừ tiền nhưng đơn hàng vẫn ở trạng thái chưa thanh toán (`PENDING`).

## 4. Lỗi truy vấn: Lấy sai Customer ID trong Support CSAT
- **Module:** `Support / CSKH`
- **Tập tin:** `backend/api/src/modules/support/support.service.ts` (Hàm `submitCsat`)
- **Vấn đề:** 
  - Dòng 51-55: Code thực hiện truy vấn `auth_user_id = user.sub` và dùng hàm `.single()` để tìm `customers.id`.
- **Hậu quả:** Truy vấn bị thiếu điều kiện lọc theo `tenant_id`. Nếu một người dùng đóng vai trò làm khách hàng ở 2 cơ sở (tenant) khác nhau, truy vấn sẽ trả về nhiều dòng. Hàm `.single()` của Supabase sẽ quăng lỗi và khiến tính năng gửi đánh giá CSAT bị crash.

## 5. Lỗi bảo mật: TOTP Replay Attack trong Coffee Pass
- **Module:** `Coffee Pass`
- **Tập tin:** `backend/api/src/modules/coffee-pass/coffee-pass.service.ts` (Theo báo cáo của B2)
- **Vấn đề:** Mã TOTP có hiệu lực trong 30 giây (Epoch window) nhưng không được đánh dấu là "đã sử dụng" (không có Redis cache ghi nhận lại).
- **Hậu quả:** Một mã TOTP khi sinh ra có thể được scan và redeem nhiều lần trong cùng một khung thời gian 30 giây, dẫn đến nguy cơ khách hàng bị trừ nhiều lượt nước cho 1 lần lấy mã.

## 6. Code dư thừa: Lặp lại Guards (Chưa tối ưu)
- **Vấn đề chung:** Một số Controller của B2 bị gắn lặp lại decorator `@UseGuards(...)` trong khi hệ thống của B1 đã có cấu hình Global Guard cho các xử lý này.
- **Hậu quả:** Dư thừa logic kiểm tra phân quyền, làm giảm hiệu năng xử lý request không cần thiết.

---

## Fix Status — Code Review Fix Round

### Issue 1 — Group Order Foreign Key Violation

**Status:** FIXED

**Root cause:** `addCartItem` lưu `added_by_customer_id: user.sub` — đây là `auth.users.id` (UUID từ JWT), không phải `customers.id`. Khi `confirmGroupOrder` insert vào `order_items`, FK constraint `added_by_customer_id REFERENCES customers(id)` bị vi phạm → crash.

**Fix:**
- Trước khi vào Redis optimistic lock loop, resolve `customers.id` bằng:
  ```
  .eq('auth_user_id', user.sub).eq('tenant_id', user.tenant_id)
  ```
- Nếu không tìm thấy customer (ví dụ STAFF thêm hộ) → lưu `null` thay vì UUID sai.
- `confirmGroupOrder` đọc `added_by_customer_id` từ cart item (đã là customers.id) → insert đúng.

**Files changed:** `backend/api/src/modules/group-order/group-order.service.ts`

**Test:** NOT EXECUTED (cần Supabase + Redis live). Logic: auth user → resolve tenant-scoped customer → add cart (lưu customers.id) → confirm → order_items.added_by_customer_id = customers.id.

**Remaining risk:** Nếu customer chưa tồn tại trong bảng customers (khách vãng lai), added_by_customer_id = null — chấp nhận được theo schema (cột nullable).

---

### Issue 2 — Group Order Realtime Room Cannot Be Joined

**Status:** FIXED

**Root cause:** `emitGroupOrderCartUpdated` emit vào room `group_order:{tenantId}:{tableId}` nhưng gateway không có handler cho client join room đó.

**Fix:**
- Thêm `@SubscribeMessage('join_group_order')` handler trong `RealtimeGateway`.
- tenant_id lấy từ `(client as any).user.tenant_id` — set bởi `handleConnection` sau JWT verify. Client không thể inject tenant khác.
- Client chỉ join room `group_order:{user.tenant_id}:{tableId}` — đúng tenant scope.
- Thêm `@SubscribeMessage('leave_group_order')` handler để cleanup.
- Room name khớp chính xác với `emitGroupOrderCartUpdated`.
- Imports thêm: `SubscribeMessage`, `MessageBody`, `ConnectedSocket`.

**Files changed:** `backend/api/src/common/realtime/realtime.gateway.ts`

**Test:** NOT EXECUTED (cần live WebSocket connection). Flow: socket handshake → JWT verify → emit join_group_order({table_id}) → server join room → group_order_cart_updated đến client.

**Remaining risk:** Không verify table thuộc tenant (RLS của Supabase đã enforce khi REST join, không lặp lại ở WS để giảm latency).

---

### Issue 3 — Wallet Payment Atomicity

**Status:** FIXED

**Root cause:** `walletService.payWithWallet()` và `orders.update(COMPLETED)` là 2 PostgREST request độc lập. Nếu crash giữa 2 dòng → ví bị trừ nhưng order vẫn PENDING.

**Fix:**
- Tạo migration mới `005_pay_order_wallet.sql` với PostgreSQL function `fn_pay_order_wallet(p_order_id, p_auth_user_id, p_tenant_id)`.
- Function dùng `FOR UPDATE` (row-level lock) trên cả `orders` và `wallets`.
- Toàn bộ logic trong 1 transaction: validate order → validate wallet → debit PROMO trước MAIN sau → insert wallet_transactions → update order COMPLETED → free table.
- `OrderService.payOrder` WALLET path gọi `supabaseAdmin.rpc('fn_pay_order_wallet', ...)` — một call duy nhất.
- CASH/VIETQR/COFFEE_PASS giữ nguyên flow cũ (không có risk tài chính tương tự).

**Files changed:**
- `backend/api/src/modules/order/order.service.ts`
- `backend/api/database/migrations/005_pay_order_wallet.sql` (NEW)

**Test:** NOT EXECUTED (cần Supabase live). Scenarios: insufficient balance → rollback; success → wallet + order đồng bộ; DB error mid-function → rollback toàn bộ.

**Remaining risk:** fn_pay_order_wallet phải được chạy trên Supabase SQL Editor trước khi WALLET payment hoạt động.

---

### Issue 4 — Support CSAT Customer Lookup Not Tenant-Scoped

**Status:** FIXED

**Root cause:** `submitCsat` lookup customer chỉ bằng `auth_user_id = user.sub` không có `tenant_id`. Nếu user có customer profile ở 2 tenant, `.single()` trả lỗi → crash.

**Fix:** Thêm `.eq('tenant_id', user.tenant_id)` vào customer lookup. tenant_id lấy từ JWT claim (`user.tenant_id`) — không tin client.

**Files changed:** `backend/api/src/modules/support/support.service.ts`

**Test:** NOT EXECUTED. Scenario: auth user có 2 customer profiles ở 2 tenant khác nhau → CSAT submit đúng tenant hiện tại.

**Remaining risk:** Không có.

---

### Issue 5 — Coffee Pass TOTP Replay

**Status:** FIXED

**Root cause:** TOTP verify thành công nhưng không đánh dấu "đã dùng" → cùng mã 30s có thể redeem nhiều lần.

**Fix:**
- Inject `RedisService` vào `CoffeePassService` (đã available từ global `CommonModule`).
- Thêm private method `claimTotpWindow(tenantId, subscriptionId, totpWindow)`:
  - Key: `coffee_pass:redeemed:{tenantId}:{subscriptionId}:{totpWindow}` (tenant-safe, subscription-safe)
  - `redis.set(key, '1', 'EX', 60, 'NX')` — atomic SET NX EX.
  - Return `true` nếu claimed, `false` nếu replay.
- Trong `redeem` và `redeemForOrder`: claim TOTP window TRƯỚC khi decrement DB.
- Nếu DB decrement fail sau claim → Redis key giữ nguyên (tự expire 60s) để chặn double-charge.
- Không log TOTP secret, không expose secret.

**Files changed:** `backend/api/src/modules/coffee-pass/coffee-pass.service.ts`

**Test:** NOT EXECUTED (cần Redis live). Scenarios: redeem lần 1 → success; cùng code/window lần 2 → reject "Mã này đã được sử dụng"; window mới → theo rule bình thường.

**Remaining risk:** Nếu Redis down, `claimTotpWindow` throw → request fail (fail-closed, an toàn). Có thể add try/catch để fallback nếu business yêu cầu availability > security.

---

### Issue 6 — Duplicate @UseGuards

**Status:** FIXED

**Root cause:** 4 B2 controllers (`group-order`, `wallet`, `coffee-pass`, `support`) có `@UseGuards(SupabaseAuthGuard, TenantGuard, RolesGuard)` trùng với guards đã global trong `CommonModule` (APP_GUARD token).

**Fix:** Xóa `@UseGuards(...)` và các import guard thừa từ 4 controllers. `@Roles()` giữ nguyên vì RolesGuard global đọc metadata này. `reservation` và `order` controllers không bị ảnh hưởng (đã đúng từ trước).

**Verification:** `SupabaseAuthGuard`, `TenantGuard`, `RolesGuard` vẫn chạy global. `@Public()` trên webhook vẫn hoạt động. `@Roles()` trên từng endpoint vẫn hoạt động.

**Files changed:**
- `backend/api/src/modules/group-order/group-order.controller.ts`
- `backend/api/src/modules/wallet/wallet.controller.ts`
- `backend/api/src/modules/coffee-pass/coffee-pass.controller.ts`
- `backend/api/src/modules/support/support.controller.ts`

**Test:** Build PASS, unit tests 18/18 PASS.

**Remaining risk:** Không có.

