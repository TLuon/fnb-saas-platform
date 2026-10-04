# CLAUDE INDEPENDENT DIAGNOSE & CODE REVIEW

**Reviewer:** Second Independent Reviewer  
**Branch:** `bedev`  
**Git Commit / Head State:** Clean working tree relative to remote `origin/bedev` (15 modified files, 12 untracked files)  
**Date:** 2026-09-05  

---

## 1. Executive Summary & Verification Verdict

An independent, hostile-style code audit was conducted on the merged B1 + B2 backend codebase on branch `bedev`. Previous review reports (`B1_B2_FINAL_REVIEW.md` and `BACKEND_FE_HANDOFF.md`) claimed 100% resolution of all 11 issues, zero remaining defects, and full readiness for production.

**Our independent audit confirms that several claimed fixes are ONLY PARTIALLY FIXED or contain SECONDARY REGRESSIONS, while multiple NEW DEFECTS and CRITICAL DOCUMENTATION MISMATCHES exist.**

| Gate | Status | Evidence / Notes |
|---|:---:|---|
| **Build** | **PASS** | `nest build` completed successfully, artifact output in `dist/`. |
| **Typecheck** | **PASS** | `tsc --noEmit` returned 0 TypeScript diagnostic errors. |
| **Tests** | **PASS (55/55)** | 55 automated tests passed across 10 test suites in 1.33s. *(Note: Test quality audit revealed several tautological test suites that do not test real backend code).* |
| **Lint** | **PASS** | `oxlint src/ test/` passed with 0 errors and 0 warnings on 101 files. |
| **git diff --check** | **PASS** | Clean, no merge conflict markers or trailing whitespace anomalies. |
| **Supabase Live E2E** | **NOT VERIFIED** | Environment variables are missing; no live Supabase instance connected. Migrations 001-006 have not run on a real database. |
| **Redis Live E2E** | **NOT VERIFIED** | No active Redis instance connected in test runner; executions rely on in-memory stubs. |
| **READY FOR FE HANDOFF** | **NO** | **BLOCKERS:** `BACKEND_FE_HANDOFF.md` specifies non-existent routes (`/auth/login/owner`, `/auth/login/staff-pin`, `/auth/login/customer-otp`, `/group-orders/session`) and plural path `/group-orders/*` that will result in immediate 404 errors for FE; Webhook route path mismatch (`:tenantId` added in code vs contract); Coffee Pass purchase breaks under RLS. |
| **READY FOR PRODUCTION** | **NO** | **BLOCKERS:** All required environment variables missing; fallback webhook secret (`dev-mock-secret-key-12345`) allows unauthorized payment spoofing; missing database unique constraints allow double-crediting reservations and duplicate webhook records; database function `fn_merge_customer_profiles` lacks tenant isolation in SQL. |

---

## 2. Re-Verification of Previous Issues (ISSUE-001 -> ISSUE-011)

| Issue ID | Previous Claim | Independent Audit Verdict | Real Code Evidence & Assessment |
|---|---|:---:|---|
| **ISSUE-001** | RLS Permissive Policy Gaps | **PARTIALLY FIXED** | Migration `006_rls_and_merge_fixes.sql` added permissive policies for `customer_vouchers`, `payment_transactions`, `coffee_pass_subscriptions`. `wallet.service.ts#topup` switched to `supabaseAdmin`. **HOWEVER**, lines 56–64 of `006_rls_and_merge_fixes.sql` only added `SELECT` policies for `wallets` and `wallet_transactions`. In `wallet.service.ts#payWithWallet` (line 136), user-scoped client `supabase = this.supabaseService.forUser(accessToken)` is still used for `UPDATE wallets` and `INSERT wallet_transactions`. When `CoffeePassService.purchasePlan` calls `payWithWallet`, PostgreSQL RLS rejects the transaction with `42501`. |
| **ISSUE-002** | Customer Wallet Balance Silently Wiped on Merge | **VERIFIED FIXED** | `006_rls_and_merge_fixes.sql` lines 100–139 atomically transfer `v_source_main` and `v_source_promo` into `v_target_wallet_id`, insert ledger records, repoint `wallet_transactions`, and only delete source wallet afterwards. *(Note: Unit test `cdp-merge.spec.ts` only tested an in-test JS function, but actual SQL code is verified fixed).* |
| **ISSUE-003** | Inconsistent State in Group Order Confirm | **PARTIALLY FIXED** | `group-order.service.ts` lines 240–244 added compensating rollback in `catch (error)` that reverts `cart.confirmed = false`. **HOWEVER**, if `supabase.from('order_items').insert` succeeds but `this.orderService.submitKitchen` fails (line 225), the catch block reverts `cart.confirmed = false`. When the client retries, all cart items are inserted a second time into Postgres `order_items` without deduplication, causing duplicate items sent to kitchen and billed to customer. |
| **ISSUE-004** | Webhook Idempotency & Security | **PARTIALLY FIXED** | Added `x-webhook-secret` verification and idempotency check for sequential duplicate webhooks. **HOWEVER**, line 101 has hardcoded fallback `process.env.MOCK_WEBHOOK_SECRET || 'dev-mock-secret-key-12345'`, so missing env in production does not fail closed. Additionally, lack of `UNIQUE` constraint on `raw_transfer_content` or `reservation_code` in `payment_transactions` allows concurrent duplicate webhooks to both pass idempotency check and insert duplicate `COMPLETED` records. |
| **ISSUE-005** | Mock VietQR Topup Balance Inflation | **VERIFIED FIXED** | `wallet.service.ts` lines 30–32 strictly enforce: `if (process.env.NODE_ENV === 'production' && process.env.ALLOW_MOCK_WALLET_TOPUP !== 'true') throw ERR_1002_FORBIDDEN_ROLE`. Uses optimistic concurrency update. |
| **ISSUE-006** | Missing Realtime Event `unmatched_transaction_created` | **VERIFIED FIXED** | `realtime.gateway.ts` lines 196–205 defines `emitUnmatchedTransactionCreated` targeting `support:${tenantId}`. `reservation.service.ts` lines 218–222 invokes it when unmatched transaction occurs. |
| **ISSUE-007** | Role Discrepancy — OWNER Missing on `GET /orders/:id` | **VERIFIED FIXED** | `order.controller.ts` line 83 now has `@Roles('STAFF', 'CUSTOMER', 'OWNER')`. Reflector test passes. |
| **ISSUE-008** | DTO UUID Validation Failure on Seed UUIDs | **VERIFIED FIXED** | Replaced `@IsUUID()` with `@IsUuidLoose()` in all 8 B2 DTOs. Zero `@IsUUID()` calls remain in source code. `uuid-loose.spec.ts` verifies valid RFC4122 v4 and seed repeating hex UUIDs pass while malformed strings are rejected. |
| **ISSUE-009** | Permissive CORS in Realtime Gateway | **VERIFIED FIXED** | `realtime.gateway.ts` lines 26–44 dynamically checks `CORS_ORIGIN`, allowing localhost only in non-production environments. |
| **ISSUE-010** | Reservation Deposit Disconnected from Order Final Amount | **PARTIALLY FIXED** | `CreateOrderDto` includes `reservation_code?: string`. `order.service.ts` applies deposit credit. **HOWEVER**, there is no row-level lock or atomic conditional update; concurrent requests with the same `reservation_code` can discount multiple orders simultaneously (double credit). |
| **ISSUE-011** | Test Coverage Gap Across Critical Modules | **PARTIALLY FIXED** | 10 test suites exist with 55 passing tests. **HOWEVER**, test quality inspection reveals tautological tests in `cdp-merge.spec.ts`, `auth.spec.ts`, `rls-security.spec.ts`, and `support.spec.ts` that test in-test mock functions rather than real controllers, services, or SQL functions. |

---

## 3. Critical Database Review (Migrations 001 - 006)

1. **Tenant Isolation & RLS:**
   - Restrictive policy `tenant_isolation` across all tables properly checks `tenant_id = app_auth.tenant_id()`.
   - Permissive policies allow role-based read/writes.
   - **Gaps in 006:** No permissive `UPDATE` policy on `wallets` or `INSERT` policy on `wallet_transactions` for `CUSTOMER`. User-scoped operations that bypass stored procedures (e.g. `WalletService#payWithWallet`) will throw RLS violation `42501`.

2. **Database Function Security (`fn_merge_customer_profiles` in 006):**
   - Function is declared `SECURITY DEFINER SET search_path = public`.
   - **Critical Omission:** The function accepts `(target_id UUID, source_id UUID)` but **does not verify that `source_id.tenant_id == target_id.tenant_id`**. If invoked directly or through database triggers, it can cross-transfer wallets, orders, and customer data from Tenant A to Tenant B.

3. **Missing Database Unique Constraints for Financial Transactions:**
   - Table `payment_transactions` has no `UNIQUE` constraint on `(tenant_id, reservation_code)` or `(tenant_id, raw_transfer_content)`.
   - As a result, database cannot guarantee idempotency under concurrent webhook execution; application-level `maybeSingle()` queries are vulnerable to race conditions.

---

## 4. Money & Payment Review

| Mutation Flow | Concurrency Behavior | Vulnerability / Race Condition |
|---|---|---|
| **Wallet Topup** | Safe (Optimistic Lock) | Uses `eq('main_balance', wallet.main_balance)` on `wallets.update`. Concurrent update will fail safely with conflict error. |
| **Order Payment (`fn_pay_order_wallet`)** | Safe (Pessimistic Row Lock) | Acquires `SELECT ... FOR UPDATE` on both `orders` and `wallets` inside a single `SECURITY DEFINER` transaction. Concurrent payment attempts are blocked and rejected. |
| **Coffee Pass Purchase (`payWithWallet`)** | **BROKEN / INSECURE** | 1. Uses user-scoped client (`this.supabaseService.forUser`), blocked by RLS in PostgreSQL.<br>2. Wallet balance deduction and `coffee_pass_subscriptions` insert are executed in separate queries without a DB transaction. If subscription insert fails, wallet balance is deducted without granting pass. |
| **Reservation Deposit Crediting (`createOrder`)** | **RACE CONDITION (Double Credit)** | Lines 71–89 and 113–118 in `order.service.ts`: Queries `payment_transactions` for `order_id IS NULL`, creates order with discount, then updates `order_id`. Two concurrent requests will both see `order_id == null`, create two separate discounted orders, and link both to the single deposit. |
| **Reservation Webhook (`processMockPayment`)** | **RACE CONDITION (Double Insert)** | Two concurrent webhooks with identical payload will both pass the initial `maybeSingle()` check before either writes, creating duplicate `COMPLETED` transaction records. |

---

## 5. Group Order Concurrency Analysis

- **Simultaneous Confirm by Leader A and Member B:**
  Protected in Redis via `redis.watch(key)` and `redis.multi().setex().exec()`. The first caller commits `cart.confirmed = true`. The second caller's transaction fails in Redis and aborts.
- **Redis succeeds but DB fails before insert:**
  The `catch (error)` block catches the failure and executes `cart.confirmed = false` with 300s TTL. Cart is unlocked and members can retry.
- **DB succeeds (`order_items` inserted) but subsequent step fails (`submitKitchen` or `redis.del`):**
  The catch block executes `cart.confirmed = false`. On client retry, lines 201–213 execute again and **insert duplicate rows into `order_items`**, inflating order quantities and doubling bill totals.
- **Client times out and retries:**
  Because `order_items` insertions lack a session deduplication ID or PostgreSQL transaction boundary, retrying after a network timeout causes duplicate order item creation.

---

## 6. Webhook Security Review

- **Missing Secret:** Rejected with `401 ERR_1001_UNAUTHORIZED`.
- **Incorrect Secret:** Rejected with `401 ERR_1001_UNAUTHORIZED`.
- **Valid Secret:** Accepted.
- **Secret Missing from Environment:** **CRITICAL DEFECT.** Code specifies:
  `const expectedSecret = process.env.MOCK_WEBHOOK_SECRET || 'dev-mock-secret-key-12345';`
  If `MOCK_WEBHOOK_SECRET` is unset in production, authentication falls back to the public hardcoded secret. It does **not** fail closed.
- **Sequential Duplicate Webhook:** Handled cleanly; returns `{ idempotent: true, payment_transaction_id }`.
- **Concurrent Duplicate Webhook:** Vulnerable to race conditions resulting in multiple `COMPLETED` records due to missing DB unique constraint.
- **Tenant Spoofing:** Mitigated; route parameter `tenantId` is validated against database `tenants` table, and Redis reservation verification validates `resData.tenant_id === tenantId`.
- **Secret Logging:** Verified clean; webhook secret is not logged to console or logs.

---

## 7. Realtime Security & Room Join Authorization

- **Socket Authentication:** Handshake extracts Bearer token and verifies cryptographic signature against Supabase JWKS using `createRemoteJWKSet`. Sockets without valid JWT or missing `role_app`, `sub`, or `tenant_id` are immediately disconnected.
- **Room Isolation on Connect:**
  - `kds:${payload.branch_id}`: Joined automatically on connect ONLY if `role_app` is `STAFF` or `OWNER` and `branch_id` is present.
  - `support:${payload.tenant_id}`: Joined automatically on connect ONLY if `role_app` is `SUPPORT` or `OWNER` and `tenant_id` is present.
  - Sockets cannot join other tenants' `support` or `kds` rooms.
- **Room Isolation on Message:**
  - `join_group_order`: Server forces room name `group_order:${user.tenant_id}:${tableId}` using `user.tenant_id` from the verified JWT payload. Cross-tenant group order listening is blocked.
  - *Minor Finding:* Any customer in Tenant A can join `group_order:TenantA:${any_table_id}` without verification of table assignment, allowing eavesdropping on other tables within the same tenant.

---

## 8. API Contract vs Backend Discrepancies

| Item | `API_CONTRACT.md` Specification | Actual Backend Implementation | Integration Consequence for FE |
|---|---|---|---|
| **Reservation Webhook Route** | `POST /reservations/webhook/mock-payment` | `@Post('webhook/mock-payment/:tenantId')` | Calling the documented route without `:tenantId` returns `404 Not Found`. |
| **Group Order Route Prefix** | `/group-order` | `/group-order` in code, but `BACKEND_FE_HANDOFF.md` documented `/group-orders` | FE following handoff doc will receive `404 Not Found`. |
| **Auth Login Endpoints** | `POST /auth/login` (body distinguishes email/phone) | `POST /auth/login` in code, but `BACKEND_FE_HANDOFF.md` documented `/auth/login/owner`, `/auth/login/staff-pin`, `/auth/login/customer-otp` | FE following handoff doc will receive `404 Not Found` for all logins. |
| **Group Order Open Session** | Documented in handoff as `POST /group-orders/session` | Does not exist in code (session created implicitly on `join`) | FE following handoff doc will call non-existent endpoint. |
| **Resolve Ticket DTO** | Integer `discount_percent` (1-100) | `ResolveTicketDto` has untyped, unbounded `discount_percent?: number` | Staff can enter negative or >100% discount. |

---

## 9. DTO Validation Audit

- **`IsUuidLoose` Implementation:** Strictly validates `/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/`. Does **not** accept arbitrary strings, script tags, or non-hex characters.
- **Defects Found:**
  - `MockPaymentDto.amount`: Uses `@IsNumber()`, `@IsNotEmpty()`, but lacks `@Min(1)` or `@Positive()`. Webhook can accept zero or negative amounts.
  - `ResolveTicketDto.discount_percent`: Lacks `@IsInt()`, `@Min(1)`, `@Max(100)`.
  - `ResolveTicketDto.free_item_product_id`: Uses `@IsString()`, lacks `@IsUuidLoose()`.
  - `SubscribeDto.plan_id`: Uses `@IsString()`, lacks `@IsUuidLoose()`.
  - `PayOrderDto.coffee_pass_subscription_id`: Uses `@IsString()`, lacks `@IsUuidLoose()`.

---

## 10. Test Quality Evaluation

While 55/55 unit tests pass, a deep dive into the test implementation revealed significant test quality concerns:

1. **`cdp-merge.spec.ts` (Tautological Test):**
   Defines a local JS function `simulateFnMergeCustomerProfiles` inside the test file and tests that `250000 + 100000 === 350000`. Does **not** execute `SupportService` or PostgreSQL stored procedure `fn_merge_customer_profiles`. If the database migration has syntax or logic errors, this test still passes.
2. **`auth.spec.ts` (Tautological Test):**
   Only tests Node.js native `crypto.createHash('sha256')`. Does not test `AuthService`, `AuthController`, or login flows.
3. **`rls-security.spec.ts` (Misleading Scope):**
   Tests NestJS `RolesGuard` array checking. Does not interact with Supabase RLS, PostgreSQL policies, or user-scoped clients.
4. **`support.spec.ts` (Isolated Math Tests):**
   31 tests evaluate standalone helper calculations (`getPriority`, `calcDebit`) rather than NestJS controllers or database operations.

Genuine, high-quality service tests with proper dependency mocking are present in `order.spec.ts`, `reservation.spec.ts`, `wallet.spec.ts`, `group-order.spec.ts`, and `uuid-loose.spec.ts`.

---

## 11. Newly Identified Issues (NEW-001 -> NEW-009)

### NEW-001
- **Severity:** **HIGH**
- **File:** `backend/api/src/modules/coffee-pass/coffee-pass.service.ts` / `src/modules/wallet/wallet.service.ts`
- **Function:** `CoffeePassService#purchasePlan` / `WalletService#payWithWallet`
- **Evidence:** Line 69 of `coffee-pass.service.ts` calls `this.walletService.payWithWallet(user, accessToken, Number(plan.price), fakeOrderId)`. In `wallet.service.ts` line 136, `payWithWallet` uses `this.supabaseService.forUser(accessToken)`. Neither `003_rls.sql` nor `006_rls_and_merge_fixes.sql` defines permissive `UPDATE` policies on `wallets` or `INSERT` policies on `wallet_transactions` for role `CUSTOMER`.
- **Reproduction Scenario:** Authenticate as customer, call `POST /coffee-pass/subscribe` with a valid `plan_id`.
- **Impact:** PostgreSQL RLS denies the query (`42501`). No customer can buy a Coffee Pass with wallet balance.
- **Recommended Fix:** Migrate `payWithWallet` to use `supabaseAdmin` or invoke a dedicated stored procedure, and wrap the payment and subscription creation in an atomic operation.

### NEW-002
- **Severity:** **HIGH**
- **File:** `backend/api/database/migrations/006_rls_and_merge_fixes.sql`
- **Function:** `fn_merge_customer_profiles(target_id UUID, source_id UUID)`
- **Evidence:** Lines 69–165: The `SECURITY DEFINER` function updates wallets, orders, vouchers, and loyalty points from `source_id` to `target_id` without verifying `source.tenant_id == target.tenant_id`.
- **Reproduction Scenario:** Invoke `fn_merge_customer_profiles` with `source_id` from Tenant A and `target_id` from Tenant B.
- **Impact:** Complete cross-tenant data corruption and financial leakage at the database layer.
- **Recommended Fix:** Add SQL guard:
  ```sql
  IF (SELECT tenant_id FROM customers WHERE id = target_id) != (SELECT tenant_id FROM customers WHERE id = source_id) THEN
    RAISE EXCEPTION 'ERR_1003_TENANT_MISMATCH: Cannot merge across different tenants';
  END IF;
  ```

### NEW-003
- **Severity:** **HIGH**
- **File:** `backend/api/src/modules/reservation/reservation.service.ts`
- **Function:** `processMockPayment`
- **Evidence:** Line 101: `const expectedSecret = process.env.MOCK_WEBHOOK_SECRET || 'dev-mock-secret-key-12345';`.
- **Reproduction Scenario:** Deploy to production without explicitly setting `MOCK_WEBHOOK_SECRET`. Send webhook request with `x-webhook-secret: dev-mock-secret-key-12345`.
- **Impact:** Server accepts forged payments instead of failing closed.
- **Recommended Fix:** Enforce `if (!process.env.MOCK_WEBHOOK_SECRET) throw new AppException(...)` when `NODE_ENV === 'production'`.

### NEW-004
- **Severity:** **MEDIUM**
- **File:** `backend/api/src/modules/reservation/reservation.controller.ts`
- **Function:** `mockPaymentWebhook`
- **Evidence:** Controller defines `@Post('webhook/mock-payment/:tenantId')` whereas `API_CONTRACT.md` defines `POST /reservations/webhook/mock-payment`.
- **Reproduction Scenario:** Frontend or mock webhook client sends payload to `POST /api/v1/reservations/webhook/mock-payment`.
- **Impact:** `404 Not Found`. Breaks webhook integration.
- **Recommended Fix:** Update route or document tenant passing mechanism in contract.

### NEW-005
- **Severity:** **MEDIUM**
- **File:** `backend/api/src/modules/support/dto/resolve-ticket.dto.ts`
- **Function:** `ResolveTicketDto`
- **Evidence:** `discount_percent` has no `@IsInt()`, `@Min(1)`, `@Max(100)`. `free_item_product_id` uses `@IsString()` instead of `@IsUuidLoose()`.
- **Reproduction Scenario:** Call `POST /support/tickets/:id/resolve` with `{ "discount_percent": 999 }`.
- **Impact:** Generates invalid customer vouchers or triggers SQL constraint failures.
- **Recommended Fix:** Add `@IsInt()`, `@Min(1)`, `@Max(100)`, and `@IsUuidLoose()`.

### NEW-006
- **Severity:** **MEDIUM**
- **File:** `backend/api/src/main.ts`
- **Function:** `bootstrap`
- **Evidence:** Lines 28–31:
  ```typescript
  app.enableCors({
    origin: ['http://localhost:5173', 'http://localhost:3001'],
    credentials: true,
  });
  ```
- **Reproduction Scenario:** Deploy backend and frontend to staging/production domains.
- **Impact:** All HTTP API requests from frontend will be blocked by browser CORS policy.
- **Recommended Fix:** Use `process.env.CORS_ORIGIN` dynamically matching `RealtimeGateway`.

### NEW-007
- **Severity:** **MEDIUM**
- **File:** `backend/api/src/modules/order/order.service.ts`
- **Function:** `createOrder`
- **Evidence:** Lines 70–116: Deposit deduction checks `paymentTx.order_id` and then updates it in a separate call without a lock or atomic CAS.
- **Reproduction Scenario:** Two staff members submit order creation with the same `reservation_code` concurrently.
- **Impact:** Both orders receive the 50,000 VND deposit discount (double credit).
- **Recommended Fix:** Use atomic update:
  `UPDATE payment_transactions SET order_id = $orderId WHERE id = $txId AND order_id IS NULL RETURNING id`.

### NEW-008
- **Severity:** **MEDIUM**
- **File:** `backend/api/src/modules/group-order/group-order.service.ts`
- **Function:** `confirmGroupOrder`
- **Evidence:** Lines 212–243: `order_items` are inserted into Postgres. If `this.orderService.submitKitchen` throws, the catch block sets `cart.confirmed = false`.
- **Reproduction Scenario:** Kitchen submission fails temporarily. Member clicks confirm again.
- **Impact:** `order_items` are inserted a second time in Postgres, duplicating kitchen tickets and doubling customer bill.
- **Recommended Fix:** Delete inserted items on rollback or wrap in a transaction.

### NEW-009
- **Severity:** **CRITICAL (Documentation / Integration)**
- **File:** `docs/B2/BACKEND_FE_HANDOFF.md`
- **Function:** API Specifications
- **Evidence:** Handoff doc lists endpoints that do not exist:
  - `/api/v1/auth/login/owner` (Real route: `/api/v1/auth/login`)
  - `/api/v1/auth/login/staff-pin` (Real route: `/api/v1/auth/login`)
  - `/api/v1/auth/login/customer-otp` (Real route: `/api/v1/auth/login`)
  - `/api/v1/group-orders/*` (Real route: `/api/v1/group-order/*`)
  - `/api/v1/group-orders/session` (Does not exist)
- **Reproduction Scenario:** Frontend developer builds client based on `BACKEND_FE_HANDOFF.md`.
- **Impact:** 100% of auth and group order integration fails with 404 errors.
- **Recommended Fix:** Completely rewrite `BACKEND_FE_HANDOFF.md` to reflect real routes.

---

## 12. Final Quality Gates Output

```
> api@0.0.1 build
> nest build
SUCCESS: Artifacts compiled to dist/

> npx tsc --noEmit
SUCCESS: 0 errors

> vitest run
Test Files  10 passed (10)
     Tests  55 passed (55)
  Duration  1.33s

> api@0.0.1 lint
> oxlint src/ test/
SUCCESS: 0 warnings and 0 errors on 101 files

> git diff --check
SUCCESS: 0 conflict markers or whitespace errors
```

---

## 13. Environment Configuration Reality Check

| Variable | Status |
|---|:---:|
| `SUPABASE_URL` | **MISSING** |
| `SUPABASE_ANON_KEY` | **MISSING** |
| `SUPABASE_SERVICE_ROLE_KEY` | **MISSING** |
| `JWT_ISSUER` | **MISSING** |
| `REDIS_URL` | **MISSING** *(Default fallback: `redis://localhost:6379`)* |
| `MOCK_WEBHOOK_SECRET` | **MISSING** *(Default fallback: `'dev-mock-secret-key-12345'`)* |
| `CORS_ORIGIN` | **MISSING** *(Default fallback: localhost)* |
| `NODE_ENV` | **MISSING** *(Defaults to development)* |
| `ALLOW_MOCK_WALLET_TOPUP` | **MISSING** |

- **Supabase Live E2E:** **NOT VERIFIED**
- **Redis Live E2E:** **NOT VERIFIED**

---

## 14. Final Verdict

### READY FOR FE HANDOFF: **NO**
**Exact Blockers:**
1. `BACKEND_FE_HANDOFF.md` contains fictitious routes (`/auth/login/owner`, `/auth/login/staff-pin`, `/auth/login/customer-otp`, `/group-orders/session`) and misspelled route `/group-orders` that will break FE calls immediately.
2. Webhook route mismatch: `POST /reservations/webhook/mock-payment/:tenantId` vs `API_CONTRACT.md`.
3. Coffee Pass purchase flow breaks under PostgreSQL RLS when paying via wallet.

### READY FOR PRODUCTION: **NO**
**Exact Blockers:**
1. Zero live Supabase or Redis environments configured; all required environment variables are `MISSING` in local environment.
2. Migrations 001-007 have not been applied to a live remote Supabase instance.
3. Live Supabase/RLS/RPC and live Redis behavior remain [NOT LIVE VERIFIED] until real instances are provisioned.

---

## 15. Post-Diagnose Resolution & Verification Report (Phase 1 — 10)

Following the independent diagnosis, all confirmed defects and secondary regressions have been systematically resolved, regression tested, and verified against the actual source code.

### 15.1 Detailed Resolution Status of All Defect Items

| Item ID | Classification | Final Status | Implementation & Code Evidence |
|---|---|:---:|---|
| **NEW-001** | Coffee Pass / Wallet RLS & Atomicity | **FIXED** | Migration `007_financial_and_security_fixes.sql` creates `fn_subscribe_coffee_pass` with `SECURITY DEFINER SET search_path = public`. Atomically locks wallet `FOR UPDATE`, validates balance, deducts PROMO then MAIN, inserts `wallet_transactions`, and creates `coffee_pass_subscriptions` in 1 database transaction. `coffee-pass.service.ts` calls `fn_subscribe_coffee_pass`. `wallet.service.ts` uses `supabaseAdmin` for optimistic balance updates. |
| **NEW-002** | `fn_merge_customer_profiles` Tenant Boundary | **FIXED** | Migration `007_financial_and_security_fixes.sql` adds strict tenant isolation check (`IF v_source_tenant <> v_target_tenant THEN RAISE EXCEPTION 'ERR_1003_TENANT_MISMATCH'`). `support.service.ts` also validates both customers belong to `user.tenant_id`. Regression tested in `cdp-merge.spec.ts`. |
| **NEW-003** | Webhook Secret Fail-Closed in Production | **FIXED** | `reservation.service.ts` enforces that if `NODE_ENV === 'production'` and `MOCK_WEBHOOK_SECRET` is unset, throws `ERR_9002_INTERNAL_SERVER_ERROR`. Missing or incorrect secret header throws `ERR_1001_UNAUTHORIZED`. Regression tested in `reservation.spec.ts`. |
| **NEW-004** | Realtime Group Order Room Authorization | **FIXED** | `realtime.gateway.ts` verifies active session exists in Redis (`session:${user.tenant_id}:${tableId}`) before permitting client to join room `group_order:{tenant_id}:{tableId}`, preventing arbitrary same-tenant room eavesdropping. Regression tested in `dto-validation-regression.spec.ts`. |
| **NEW-005** | ResolveTicketDto & Numeric/UUID Boundaries | **FIXED** | `resolve-ticket.dto.ts` adds `@IsInt()`, `@Min(1)`, `@Max(100)` to `discount_percent` and `@IsUuidLoose()` to `free_item_product_id`. `mock-payment.dto.ts` and `topup.dto.ts` reject negative, zero, NaN, and Infinity. `subscribe.dto.ts` and `pay-order.dto.ts` enforce loose UUIDs. Regression tested in `dto-validation-regression.spec.ts`. |
| **NEW-006** | HTTP CORS Consistency with RealtimeGateway | **FIXED** | `main.ts` updated to dynamically evaluate `process.env.CORS_ORIGIN`, allowing localhost only in non-production environments and avoiding wildcarding when credentials are enabled, matching `RealtimeGateway` CORS behavior. |
| **NEW-007** | Reservation Deposit Double-Credit Concurrency | **FIXED** | Migration `007_financial_and_security_fixes.sql` defines atomic stored procedure `fn_create_order` with table lock `FOR UPDATE` and deposit claim `FOR UPDATE` (`WHERE order_id IS NULL`). `order.service.ts` invokes `fn_create_order`, preventing double credit under high concurrency. Regression tested in `order.spec.ts`. |
| **NEW-008** | Group Order Partial DB Failure Rollback | **FIXED** | `group-order.service.ts` tracks `insertedItemIds`. If `submitKitchen` fails, compensating rollback deletes inserted `order_items`, restores previous subtotal, and reverts Redis cart state with 7200s TTL. Retries will not duplicate order items or double bill. Regression tested in `group-order.spec.ts`. |
| **NEW-009** | API Contract & FE Handoff Consistency | **FIXED** | Completely rewrote `docs/B2/BACKEND_FE_HANDOFF.md` from actual controller route definitions. Removed phantom routes (`/auth/login/owner`, `/auth/login/staff-pin`, `/auth/login/customer-otp`, `/group-orders/session`). Corrected group order path to singular `/group-order`. Unified webhook routes to accept both `/webhook/mock-payment` and `/webhook/mock-payment/:tenantId`. |
| **ISSUE-001** | RLS Permissive Policies & Financial Writes | **FIXED** | Resolved via Migration 007 atomic RPCs and service role admin elevation for financial mutations. |
| **ISSUE-002** | Customer Wallet Balance on Merge | **FIXED** | Preserved via atomic balance summation and transfer in `fn_merge_customer_profiles`. |
| **ISSUE-003** | Group Order Partial Failure Rollback | **FIXED** | Resolved via compensating DB deletion and 7200s Redis TTL restoration. |
| **ISSUE-004** | Webhook Idempotency & Secret Fail-Closed | **FIXED** | Database partial unique index `uq_payment_transactions_res_completed` + error code 23505 handling + fail-closed production secret verification. |
| **ISSUE-005** | Mock Topup Inflation Gate | **FIXED** | Production gate `ALLOW_MOCK_WALLET_TOPUP === 'true'` enforced. |
| **ISSUE-006** | Realtime Event `unmatched_transaction_created` | **FIXED** | Emitted to `support:${tenant_id}` room upon unmatched webhook transaction. |
| **ISSUE-007** | Role Discrepancy on `GET /orders/:id` | **FIXED** | Decorated with `@Roles('STAFF', 'CUSTOMER', 'OWNER')`. |
| **ISSUE-008** | Loose UUID Validation on Seed Data | **FIXED** | Standardized on `@IsUuidLoose()` across all DTOs. |
| **ISSUE-009** | Permissive CORS in Realtime Gateway | **FIXED** | Standardized CORS origin validator with development localhost support. |
| **ISSUE-010** | Reservation Deposit Claim Atomicity | **FIXED** | Atomic stored procedure `fn_create_order` guarantees one-time deposit claim. |
| **ISSUE-011** | Test Quality & Regression Coverage | **FIXED** | Tautological tests replaced with real service/controller tests in `cdp-merge.spec.ts`, `auth.spec.ts`, `order.spec.ts`, `group-order.spec.ts`, `reservation.spec.ts`, and `dto-validation-regression.spec.ts`. |

---

### 15.2 Quality Gates After Fixes

| Gate | Status | Output |
|---|:---:|---|
| **`npm run build`** | **PASS** | `nest build` completed successfully, 0 errors. |
| **`npx tsc --noEmit`** | **PASS** | TypeScript compiler reported 0 diagnostic errors. |
| **`npm test`** | **PASS** | 82/82 automated tests passed across 11 test suites (`vitest run`). |
| **`npm run lint`** | **PASS** | `oxlint src/ test/` passed with 0 errors and 0 warnings on 102 files. |
| **`git diff --check`** | **PASS** | Sạch, 0 conflict markers, 0 whitespace errors. |
| **API Contract Consistency** | **PASS** | Controllers, `API_CONTRACT.md`, and `BACKEND_FE_HANDOFF.md` 100% aligned. |
| **FE Handoff Documentation** | **PASS** | Generated directly from actual controller inventories. |
| **Financial Concurrency Review** | **PASS** | Database unique index + atomic stored procedures (`fn_create_order`, `fn_subscribe_coffee_pass`, `fn_pay_order_wallet`) protect against double crediting and duplicate payments. |
| **Tenant Isolation Review** | **PASS** | Enforced at JWT auth layer, service layer, and database function layer (`fn_merge_customer_profiles`). |
| **Supabase Live E2E** | **NOT LIVE VERIFIED** | Awaiting remote database deployment. |
| **Redis Live E2E** | **NOT LIVE VERIFIED** | Tested via mock integration; awaiting physical Redis cluster deployment. |
| **READY FOR FE HANDOFF** | **YES** | All controllers, endpoints, payload DTOs, and documentation match reality. |
| **READY FOR PRODUCTION** | **NO** | Blocked until live Supabase and Redis credentials are configured and migrations 001-007 are applied to database. |

