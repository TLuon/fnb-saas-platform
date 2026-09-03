# B2 Backend Progress

## Current status
- Current phase: PHASE 8 — Integration & E2E Test (COMPLETED)
- Branch: bedev
- Last updated: 2026-09-02

## Completed
- PHASE 0: Skeleton.
- PHASE 1: Reservation.
- PHASE 2: Order / POS.
- PHASE 3: KDS realtime (Socket.IO Gateway).
- PHASE 4: Group Order (Redis session).
- PHASE 5: Wallet.
- PHASE 6: Coffee Pass (TOTP).
- PHASE 7: Support / CSKH (8 endpoints).
- PHASE 8: Integration & E2E Test (Audit + Fixes + Unit Tests).

---

## PHASE 8 — Integration Audit Summary

### Build
- **npm run build** → ✅ PASS (exit code 0)
- Builds clean với `nest build` (TypeScript strict mode)

### Unit Tests
- **npm test** → ✅ 18/18 PASS
- File: `src/modules/support/support.spec.ts`
- Test coverage:
  - CSAT Priority Logic (score <= 2 → URGENT)
  - Wallet Debit Strategy (PROMO trước, MAIN sau)
  - Maker-Checker Self-Approval Prevention
  - Coffee Pass TOTP Window Calculation
  - Reservation Code Format (^RES_[A-Z0-9]{6}$)
  - Merge Same Customer Validation
  - Group Order Confirm-twice Prevention

### E2E Tests
- **Không chạy được** — lý do: cần Supabase (cloud) + Redis (local) + .env cấu hình đầy đủ.
- Scenarios A-F được define trong yêu cầu nhưng không thể tự động hóa không có live env.
- **Không fake kết quả.**

### Security Review
- ✅ Tất cả identity (tenant_id, branch_id, role, user_id) lấy từ JWT qua `CurrentUser()` decorator.
- ✅ Client không thể inject tenant_id/role.
- ✅ `SupabaseAuthGuard → TenantGuard → RolesGuard` theo đúng thứ tự.
- ✅ `@Public()` chỉ được dùng trên `POST /reservations/webhook/mock-payment`.
- ✅ TOTP secret không bao giờ log.
- ✅ JWT không bao giờ log (chỉ dùng làm Supabase client header).
- ✅ Redis ownership token không log.
- ⚠️ **Minor**: Một số B2 controllers có `@UseGuards(...)` thừa so với global guards trong `CommonModule`. Không gây lỗi security — guards chạy 2 lần nhưng kết quả giống nhau. Inconsistent với B1 style.

### RLS / Multi-tenant Review
- ✅ Tất cả queries dùng `supabaseService.forUser(accessToken)` (RLS filter đúng theo user JWT).
- ✅ `supabaseService.admin()` chỉ được dùng cho: audit_logs insert, merge_customer_profiles RPC, customer_vouchers insert (vượt RLS cần thiết cho admin actions).
- ✅ Tenant isolation: mọi query `.eq('tenant_id', user.tenant_id)` hoặc dựa vào RLS policy.
- ✅ `reservation.processMockPayment` (webhook @Public) dùng admin client — đúng vì không có user context.
- ⚠️ **Risk**: `unmatched payment_transactions` insert không có `tenant_id` (unavoidable — webhook không biết tenant). SUPPORT phải match sau.

### Redis Audit
- ✅ `RedisService` singleton với `OnModuleDestroy → client.quit()`.
- ✅ Không tạo Redis client mới trong request path.
- ✅ Reservation lock key: `lock:{tenant_id}:{table_id}` (tenant-isolated).
- ✅ Group order session key: `session:{tenant_id}:{table_id}` (tenant-isolated).
- ✅ TTL: Reservation = 600s (10 min), Group order = 7200s (2h) → 300s sau confirm.
- ✅ Optimistic locking với `WATCH/MULTI/EXEC` pattern trong Group Order (prevent dirty write).
- ✅ Reservation lock dùng `SET NX EX` (atomic) — không có race condition khi nhiều user cùng lock.

### Realtime Audit
- ✅ `kds_new_ticket` — emit sau DB commit, đúng payload (station, items).
- ✅ `kds_item_status_changed` — emit sau DB update thành công.
- ✅ `group_order_cart_updated` — FIXED: từ direct `server.to()` sang method `emitGroupOrderCartUpdated()`.
- ✅ `support_ticket_urgent_created` — emit chỉ khi URGENT (score <= 2).
- ✅ JWT handshake bắt buộc trên WebSocket connection (jwtVerify + JWKS).
- ✅ Room isolation: `kds:{branch_id}`, `support:{tenant_id}`.
- ⚠️ **Risk**: `group_order:{tenant_id}:{table_id}` room — CUSTOMER không tự join khi connect (không có table_id lúc đó). FE phải emit `join_group_order` event sau khi gọi REST `POST /group-order/join`. Cần thêm `@SubscribeMessage('join_group_order')` handler hoặc document rõ cho FE. **Ghi vào blocker B1 nếu FE không tự xử lý.**

### Financial / Concurrency
- ✅ Wallet Topup: Optimistic lock (`UPDATE WHERE main_balance = old_value`). Nếu concurrent, throw lỗi.
- ✅ Wallet Pay: Optimistic lock trên cả `promo_balance` và `main_balance`.
- ✅ Coffee Pass Redeem: Optimistic lock trên `remaining_redemptions`.
- ⚠️ **Risk**: Atomicity giữa Wallet debit và Order status update trong `payOrder` không đảm bảo 100%. Nếu Wallet debit thành công nhưng `orders.update(COMPLETED)` fail → ví bị trừ tiền nhưng order không COMPLETED. Giảm thiểu bằng retry nhưng không có DB transaction (Supabase PostgREST không hỗ trợ cross-table transaction qua API). **Ghi vào blocker — cần DB function `fn_pay_order` từ B1 nếu muốn atomic.**
- ⚠️ **Risk**: Coffee Pass TOTP — không có replay protection (same TOTP valid trong 30s window có thể reuse). Giảm thiểu bằng `epochTolerance: 1` nhưng không hoàn toàn. Nếu cần, phải lưu used tokens trong Redis với TTL 60s.

---

## API Contract Audit

### Reservation — ✅ Contract match
| Route | Method | Contract | Status |
|---|---|---|---|
| POST /reservations/lock | POST | ✅ | PASS |
| POST /reservations/:code/generate-qr | POST | ✅ | PASS |
| POST /reservations/webhook/mock-payment | POST @Public | ✅ | PASS |
| DELETE /reservations/:code | DELETE | ✅ | PASS |

### Order — ✅ Contract match
| Route | Method | Roles | Status |
|---|---|---|---|
| POST /orders | POST | STAFF | PASS |
| POST /orders/:id/items | POST | STAFF, CUSTOMER | PASS |
| PATCH /orders/:id/items/:itemId | PATCH | STAFF, CUSTOMER | PASS |
| POST /orders/:id/submit-kitchen | POST | STAFF | PASS |
| PATCH /orders/:id/items/:itemId/kitchen-status | PATCH | STAFF | PASS |
| POST /orders/:id/pay | POST | STAFF, CUSTOMER | PASS |
| GET /orders/:id | GET | STAFF, CUSTOMER | PASS |

### Group Order — ✅ Contract match
| Route | Method | Roles | Status |
|---|---|---|---|
| POST /group-order/join | POST | CUSTOMER | PASS |
| GET /group-order/:tableId/cart | GET | CUSTOMER | PASS |
| POST /group-order/:tableId/cart/items | POST | CUSTOMER | PASS |
| POST /group-order/:tableId/confirm | POST | CUSTOMER, STAFF | PASS |

### Wallet — ✅ Contract match
| Route | Method | Roles | Status |
|---|---|---|---|
| GET /wallet | GET | CUSTOMER | PASS |
| POST /wallet/topup | POST | CUSTOMER | PASS |
| GET /wallet/transactions | GET | CUSTOMER | PASS |
| GET /wallet/vouchers | GET | CUSTOMER | PASS |

### Coffee Pass — ✅ Contract match
| Route | Method | Roles | Status |
|---|---|---|---|
| GET /coffee-pass/plans | GET | CUSTOMER | PASS |
| POST /coffee-pass/subscribe | POST | CUSTOMER | PASS |
| GET /coffee-pass/:id/current-code | GET | CUSTOMER | PASS |
| POST /coffee-pass/:id/redeem | POST | STAFF, OWNER | PASS |

### Support — ✅ Contract match
| Route | Method | Roles | Status |
|---|---|---|---|
| POST /support/csat | POST | CUSTOMER | PASS |
| GET /support/unmatched | GET | SUPPORT, OWNER | PASS |
| GET /support/unmatched/:id/suggest | GET | SUPPORT, OWNER | PASS |
| POST /support/unmatched/:id/propose | POST | SUPPORT | PASS |
| POST /support/unmatched/:id/approve | POST | SUPPORT, OWNER | PASS |
| GET /support/tickets | GET | SUPPORT, OWNER | PASS |
| POST /support/tickets/:id/resolve | POST | SUPPORT, OWNER | PASS |
| POST /support/customers/merge | POST | SUPPORT, OWNER | PASS |

---

## Fixes Applied (Phase 8)

### order.service.ts
- `ERR_4004_PRODUCT_NOT_FOUND` → `ERR_7002_PRODUCT_NOT_FOUND` (đúng group menu)
- `added_by_customer_id: user.sub` → `null` (user.sub là auth.uid, không phải customers.id)
- `ERR_4005`, `ERR_4006` → `ERR_9001_VALIDATION_FAILED` (không có trong error-codes.ts)

### group-order.service.ts
- `this.realtimeGateway.server.to(...).emit(...)` → `this.realtimeGateway.emitGroupOrderCartUpdated(...)` (encapsulation)
- `ERR_4004_PRODUCT_NOT_FOUND` → `ERR_7002_PRODUCT_NOT_FOUND`

### realtime.gateway.ts
- Thêm method `emitGroupOrderCartUpdated(tenantId, tableId, payload)`.
- Thêm room join: SUPPORT/OWNER → `support:{tenant_id}` khi connect.

---

## Known Blockers / Risks

### Blocker B1 cần xử lý
1. **Group Order WebSocket room**: CUSTOMER cần join `group_order:{tenant_id}:{table_id}` sau khi REST join. FE cần emit `join_group_order` event hoặc cần thêm `@SubscribeMessage('join_group_order')` handler vào `RealtimeGateway`.
2. **Wallet-to-Order atomicity**: Nếu cần full atomicity cho `payOrder(WALLET)`, cần DB function `fn_pay_order` để wrap debit + status update trong 1 transaction.
3. **Coffee Pass TOTP replay**: Nếu spec yêu cầu no-replay trong same 30s window, cần Redis set `totp_used:{sub}:{epoch_step}` với TTL 60s.

### Known Risks
1. ⚠️ Unmatched payment_transaction không có `tenant_id` (webhook không biết tenant).
2. ⚠️ Wallet debit + Order completed không atomic (race window nhỏ).
3. ⚠️ TOTP valid trong 30s window (± 1 step với epochTolerance) → cùng code có thể dùng 2 lần.
4. ⚠️ Duplicate `@UseGuards` trên B2 controllers so với global guards — redundant execution.
5. ⚠️ E2E scenarios không thể tự động hóa không có seeded Supabase + Redis.

---

## Database Changes Requested from B1
- Không có schema changes cần thiết cho Phase 7-8.
- Nếu muốn giải quyết atomicity blocker: cần hàm `fn_pay_order(order_id, payment_method, customer_sub)`.
- Nếu muốn giải quyết TOTP replay: không cần DB change, dùng Redis.

---

### B2_TASK.md
- `[x] PHASE 8 — Integration & E2E test`
- `[x] PHASE 9 — Final handover`

---

## Final Status

- **Phase:** PHASE 9 — Final Handover
- **Build:** PASS (npm run build)
- **Problems:** 0 (Workspace is clean, no TODOs/FIXMEs left unresolved).
- **Modules implemented:** Reservation, Order, Group Order, Wallet, Coffee Pass, Support, KDS Realtime (100% of B2 scope).
- **Tests executed:** Unit tests for business logic (`support.spec.ts` - 18/18 passed).
- **Tests not executed:** E2E tests.
- **Known blockers:** 
  - Frontend needs to emit `join_group_order` to join WebSocket room.
  - Financial atomicity between Wallet and Order requires a DB function (RPC) from B1.
- **Known risks:**
  - Unmatched payments lack `tenant_id` context (expected behavior, resolved via Support).
  - TOTP replay window of 30 seconds.
  - Duplicate `@UseGuards` on B2 controllers vs B1 global guards.
- **Ready for Git review:** YES. Code is frozen and ready for the `bedev` branch commit/push.

---

## Code Review Fix Round

**Date:** 2026-09-03
**Trigger:** B2_REVIEW_REPORT.md — 6 issues từ code review

### Issue 1 — Group Order Foreign Key Violation
- **Status:** FIXED
- **File:** `group-order.service.ts`
- **Change:** Resolve `customers.id` bằng `auth_user_id + tenant_id` trước khi lưu vào Redis cart item. Không còn lưu `user.sub` (auth.users.id) vào `added_by_customer_id`.

### Issue 2 — Group Order Realtime Room Cannot Be Joined
- **Status:** FIXED
- **File:** `realtime.gateway.ts`
- **Change:** Thêm `@SubscribeMessage('join_group_order')` và `@SubscribeMessage('leave_group_order')` handlers. tenant_id từ JWT claim, không tin client. Room name khớp `emitGroupOrderCartUpdated`.

### Issue 3 — Wallet Payment Atomicity
- **Status:** FIXED
- **Files:** `order.service.ts`, `database/migrations/005_pay_order_wallet.sql` (NEW)
- **Change:** Tạo PostgreSQL function `fn_pay_order_wallet` với `FOR UPDATE` lock + full DB transaction. `payOrder` WALLET path gọi 1 RPC duy nhất thay vì 2 independent operations.

### Issue 4 — Support CSAT Customer Lookup Not Tenant-Scoped
- **Status:** FIXED
- **File:** `support.service.ts`
- **Change:** Thêm `.eq('tenant_id', user.tenant_id)` vào customer lookup trong `submitCsat`.

### Issue 5 — Coffee Pass TOTP Replay
- **Status:** FIXED
- **File:** `coffee-pass.service.ts`
- **Change:** Inject `RedisService`. Thêm `claimTotpWindow()` dùng `SET NX EX 60`. Claim TOTP window trước khi decrement DB. Key: `coffee_pass:redeemed:{tenantId}:{subscriptionId}:{totpWindow}`.

### Issue 6 — Duplicate @UseGuards
- **Status:** FIXED
- **Files:** `group-order.controller.ts`, `wallet.controller.ts`, `coffee-pass.controller.ts`, `support.controller.ts`
- **Change:** Xóa `@UseGuards(SupabaseAuthGuard, TenantGuard, RolesGuard)` và import guard thừa. Guards đã global trong CommonModule.

### Build & Test After Fix Round
- **npm run build:** ✅ PASS (exit code 0)
- **npm test (vitest run):** ✅ 18/18 PASS
- **E2E tests:** NOT EXECUTED — cần Supabase + Redis live environment.

### New Files Created
- `backend/api/database/migrations/005_pay_order_wallet.sql`

### Known Remaining Risks After Fix
1. `fn_pay_order_wallet` phải được deploy lên Supabase SQL Editor trước khi WALLET payment hoạt động.
2. Nếu Redis down, TOTP claim sẽ throw → Coffee Pass redeem fail (fail-closed — an toàn về security).
3. `added_by_customer_id = null` với khách vãng lai (không có customer profile) — chấp nhận được theo schema (nullable FK).
4. E2E scenarios chưa thể tự động hóa không có seeded Supabase + Redis.

