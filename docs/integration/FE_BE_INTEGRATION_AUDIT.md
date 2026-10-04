# FULL PROJECT INTEGRATION AUDIT REPORT — FE + BE + REAL API + BUSINESS LOGIC

**Date**: 2026-09-24
**Repository**: `E:\CNPM\fnb-saas-platform`
**Target Branch**: `BE`
**Role**: Integration Lead / Full-stack Integration Engineer
**Status**: **READY FOR DELIVERY (All Automated & Runtime Invariants PASS)**

---

## 1. GIT SOURCE COMMITS & ANCESTRY

### Commit References
* `origin/connect`: `3f7526d` (Initial merge connect)
* `origin/BE`: `3f7526d` (Backend & integration base)
* `origin/FE`: `5162afa` (FE1 latest commit: `feat: Complete remaining F1 pages`)

### Integration Path
* Analyzed ancestry via `git merge-base origin/BE origin/FE` -> Base commit was `3f7526d`.
* Branch `BE` fast-forward integrated all 10 commits from `origin/FE` up to commit `5162afa`.
* Result: Clean git history combining all FE1 frontend work with verified B1+B2 backend business logic, migrations (001–010), and RLS policies.
* Zero git conflicts; `git diff --check` executed with clean exit code 0.

---

## 2. INTEGRATION STRATEGY

1. **Preserve Verified Backend B1+B2 Logic**:
   - Supabase auth & JWT claims mapping (`role_app`, `tenant_id`, `branch_id`).
   - Atomic order creation (`fn_create_order` RPC with table locking, deposit deduction, shift linking).
   - Strict shift guard (payment prohibited unless shift is `OPEN`).
   - Atomic inventory consumption (`fn_consume_inventory_for_order` RPC) with idempotency and ledger transactions (`ORDER_CONSUMPTION`).
   - Strict KDS state machine transitions: `QUEUED -> PREPARING -> READY -> SERVED`.
   - Distinct separation between `auth.users.id` (`sub`) and `public.users.id` (`profile.id`) in shifts and audit logs.
2. **Preserve FE1 New Frontend Implementation**:
   - Preserved all newly built pages in `apps/customer-pwa` and `apps/staff-dashboard`.
   - Preserved UI designs, components, and layout structures.
3. **Reconcile Monorepo Types & Build Tooling**:
   - Added missing `packages/utils/tsconfig.json` extending base config.
   - Added global declaration modules in `types.d.ts` for Next.js navigation and Lucide icons.
   - Fixed Axios 1.x header type compatibility in `packages/utils/src/api-client.ts`.
   - Extended `UserProfile` in `@fnb/utils` to include `tenant_id` and `branch_id`.
4. **Remove Application-Level Mocks**:
   - Replaced all artificial mock delays (`setTimeout`), fake user IDs, and mock stores with real backend endpoints.
   - Maintained test fixtures and unit test mocks intact.

---

## 3. MERGE CONFLICTS AND RESOLUTION

* **Git Tree Conflicts**: 0 (Clean fast-forward merge).
* **Code-Level Reconciliations**:
  1. *Axios Request Header Typing*: Axios 1.x `InternalAxiosRequestConfig` requires `headers.set` or `Record<string, string>` casting. Updated `packages/utils/src/api-client.ts` to support both modern Axios and Next.js webpack build without breaking token injection.
  2. *Shift Cash DTO Field Mapping*: Frontend previously submitted `initial_cash` / `final_cash`, whereas backend schema used `starting_cash` / `ending_cash`. Added backward-compatible aliases in `OpenShiftDto`, `CloseShiftDto`, and `shift.service.ts` so either naming convention works seamlessly.
  3. *Staff Shift Opening Without Redundant Branch Param*: In `OpenShiftDto`, `branch_id` was decorated with `@IsNotEmpty()`. Since STAFF users already have `branch_id` baked into their validated JWT claims, requiring `branch_id` in the request body caused needless validation failures. Changed `branch_id` to `@IsOptional()`.
  4. *CDP Customer Filtering*: Frontend requested `segment='ALL'`. Backend expected an enum segment and rejected `'ALL'`. Updated `ListCustomersQueryDto` and `cdp.service.ts` to treat `'ALL'` or missing segment as querying all tenant customers.
  5. *Owner Dashboard Query*: `DashboardQueryDto` made `branch_id` optional, defaulting to tenant-wide aggregation when an owner does not specify a branch filter.

---

## 4. FRONTEND–BACKEND API MAPPING

| Frontend Page / Component | Frontend Store / Function | Backend Endpoint | Request DTO / Params | Response Shape | Roles | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `CustomerLoginPage` / `StaffLogin` | `apiClient.post('/auth/login')` | `POST /api/v1/auth/login` | `{ email, password }` | `{ success: true, data: { user, session } }` | ALL | **PASS** |
| `StaffAuthProvider` / `AuthProvider` | `apiClient.get('/auth/me')` | `GET /api/v1/auth/me` | None (Bearer JWT) | `{ success: true, data: UserProfile }` | ALL | **PASS** |
| `PublicHeader` / `MenuPage` | `apiClient.get('/public/catalog')` | `GET /api/v1/public/catalog` | `?tenant_subdomain=cafe-and-cake` | `{ success: true, data: { tenant, categories, products } }` | PUBLIC / ALL | **PASS** |
| `POS.tsx` | `useMenuStore.fetchMenu()` | `GET /api/v1/categories`, `GET /api/v1/products` | None (Tenant from JWT) | `{ success: true, data: Category[] / Product[] }` | STAFF, OWNER | **PASS** |
| `POS.tsx` (Tables) | `apiClient.get('/floors?branch_id=')` | `GET /api/v1/floors` | `?branch_id=<uuid>` | `{ success: true, data: Floor[] }` | STAFF, OWNER | **PASS** |
| `POS.tsx` (Tables) | `apiClient.get('/floors/:id/tables')` | `GET /api/v1/floors/:id/tables` | Param: `id` | `{ success: true, data: Table[] }` | STAFF, OWNER | **PASS** |
| `POS.tsx` (Create Order) | `apiClient.post('/orders')` | `POST /api/v1/orders` | `{ order_type, table_id? }` | `{ success: true, data: { order_id, order_code } }` | STAFF | **PASS** |
| `POS.tsx` (Add Item) | `apiClient.post('/orders/:id/items')` | `POST /api/v1/orders/:id/items` | `{ product_id, quantity, modifiers? }` | `{ success: true, data: { message } }` | STAFF, CUSTOMER | **PASS** |
| `POS.tsx` (Submit Kitchen) | `apiClient.post('/orders/:id/submit-kitchen')` | `POST /api/v1/orders/:id/submit-kitchen` | None | `{ success: true, data: { message } }` | STAFF | **PASS** |
| `KDS.tsx` | `useKdsStore.fetchSnapshot()` | `GET /api/v1/orders/kds` | `?status=&station=` | `{ success: true, data: KdsItem[] }` | STAFF, OWNER | **PASS** |
| `KDS.tsx` (Status Transition) | `apiClient.patch('/orders/:id/items/:itemId/kitchen-status')` | `PATCH /api/v1/orders/:id/items/:itemId/kitchen-status` | `{ kitchen_status: 'PREPARING'\|'READY'\|'SERVED' }` | `{ success: true, data: { message } }` | STAFF | **PASS** |
| `POS.tsx` (Payment) | `apiClient.post('/orders/:id/pay')` | `POST /api/v1/orders/:id/pay` | `{ payment_method: 'VIETQR'\|'WALLET'\|'COFFEE_PASS' }` | `{ success: true, data: { message } }` | STAFF, CUSTOMER | **PASS** |
| `ShiftManagement.tsx` | `useShiftStore.fetchCurrentShift()` | `GET /api/v1/shifts/current` | `?branch_id=` | `{ success: true, data: Shift \| null }` | STAFF, OWNER | **PASS** |
| `ShiftManagement.tsx` | `useShiftStore.openShift()` | `POST /api/v1/shifts/open` | `{ starting_cash, branch_id? }` | `{ success: true, data: Shift }` | STAFF, OWNER | **PASS** |
| `ShiftManagement.tsx` | `useShiftStore.closeShift()` | `POST /api/v1/shifts/:id/close` | `{ ending_cash, notes? }` | `{ success: true, data: Shift }` | STAFF, OWNER | **PASS** |
| `InventoryManagement.tsx` | `useInventoryStore.fetchIngredients()` | `GET /api/v1/inventory/ingredients` | None | `{ success: true, data: Ingredient[] }` | OWNER, STAFF | **PASS** |
| `InventoryManagement.tsx` | `useInventoryStore.fetchTransactions()` | `GET /api/v1/inventory/transactions` | `?limit=20&page=1` | `{ success: true, data: { data: Tx[], meta } }` | OWNER, STAFF | **PASS** |
| `CustomerWalletPage` | `apiClient.get('/wallet')` | `GET /api/v1/wallet` | None | `{ success: true, data: { id, main_balance, promo_balance } }` | CUSTOMER | **PASS** |
| `CustomerWalletPage` | `apiClient.get('/wallet/transactions')` | `GET /api/v1/wallet/transactions` | `?page=1&limit=20` | `{ success: true, data: WalletTransaction[] }` | CUSTOMER | **PASS** |
| `CustomerWalletPage` | `apiClient.get('/wallet/vouchers')` | `GET /api/v1/wallet/vouchers` | None | `{ success: true, data: Voucher[] }` | CUSTOMER | **PASS** |
| `SupportDashboard` | `useTicketStore.fetchTickets()` | `GET /api/v1/support/tickets` | None | `{ success: true, data: Ticket[] }` | SUPPORT, OWNER | **PASS** |
| `SupportDashboard` | `useTicketStore.resolveTicket()` | `POST /api/v1/support/tickets/:id/resolve` | `{ resolution_type, resolution_note? }` | `{ success: true, data: Ticket }` | SUPPORT, OWNER | **PASS** |
| `SupportDashboard` | `useSupportStore.fetchUnmatched()` | `GET /api/v1/support/unmatched` | None | `{ success: true, data: UnmatchedTransaction[] }` | SUPPORT, OWNER | **PASS** |
| `MergeCustomerModal` | `useSupportStore.mergeCustomers()` | `POST /api/v1/support/customers/merge` | `{ source_customer_id, target_customer_id }` | `{ success: true, data: { message } }` | SUPPORT, OWNER | **PASS** |
| `CDPDashboard` | `useCdpStore.fetchCustomers()` | `GET /api/v1/cdp/customers` | `?segment=ALL` | `{ success: true, data: Customer[] }` | OWNER, SUPPORT | **PASS** |
| `AnalyticsDashboard` | `useAnalyticsStore.fetchMetrics()` | `GET /api/v1/reports/dashboard` | `?branch_id=` | `{ success: true, data: DashboardMetrics }` | OWNER | **PASS** |

---

## 5. MOCK REMOVAL INVENTORY

| File Path | Previous Mock Pattern | Replacement with Real API |
| :--- | :--- | :--- |
| `apps/staff-dashboard/src/store/supportStore.ts` | Static arrays, `setTimeout(..., 500)` for unmatched transactions, suggestions, proposals | Wired to `GET /support/unmatched`, `GET /support/unmatched/:id/suggest`, `POST /support/unmatched/:id/propose`, `POST /support/unmatched/:id/approve` |
| `apps/staff-dashboard/src/store/ticketStore.ts` | Hardcoded `mockTickets` array, fake resolution delay | Wired to `GET /support/tickets`, `POST /support/tickets/:id/resolve` |
| `apps/staff-dashboard/src/components/support/MergeCustomerModal.tsx` | Simulated merge timeout and local state mutation | Wired to real CDP lookup and `POST /support/customers/merge` |
| `apps/staff-dashboard/src/store/shiftStore.ts` | `mockShifts` static array, local store filtering | Wired to real `GET /shifts`, `GET /shifts/current`, `POST /shifts/open`, `POST /shifts/:id/close` |
| `apps/staff-dashboard/src/pages/ShiftManagement.tsx` | Hardcoded initial cash payload and dummy branch ID | Updated to real UUID branch from auth store and proper `starting_cash` / `ending_cash` DTO |
| `apps/staff-dashboard/src/store/cdpStore.ts` | Mock customer profiles, fake metrics fallback | Replaced with real `GET /cdp/customers`, `GET /cdp/customers/:id/360`, `POST /cdp/customers/:id/vouchers` |
| `apps/staff-dashboard/src/store/analyticsStore.ts` | Hardcoded revenue & chart data fallback | Wired to real `GET /reports/dashboard` using tenant and branch context |
| `apps/staff-dashboard/src/store/inventoryStore.ts` | Mock ingredients, fake stock adjustments | Wired to `GET /inventory/ingredients`, `GET /inventory/transactions`, `POST /inventory/transactions` |
| `apps/staff-dashboard/src/pages/POS.tsx` | Fake orders, unpersisted cart state, invalid `/menu` endpoint | Connected to `GET /categories`, `GET /products`, real `POST /orders`, `POST /orders/:id/items`, `POST /orders/:id/submit-kitchen`, `POST /orders/:id/pay` |
| `apps/customer-pwa/src/app/wallet/page.tsx` | Hardcoded balance (150k), fake transactions list | Connected to real `GET /wallet`, `GET /wallet/transactions`, `GET /wallet/vouchers` |
| `apps/customer-pwa/src/components/FeaturedMenuSection.tsx` | Dummy query `tenant_subdomain=demo&branch_id=b1` | Updated to real seeded tenant `cafe-and-cake` with valid branch scoping |

---

## 6. AUTHENTICATION & AUTHORIZATION AUDIT

### Identity & Claims Model
- **Supabase Authentication**: Standard `sub` corresponds to `auth.users.id`.
- **Application Profile**: Corresponds to `public.users.id`. Helper `resolvePublicUserId` in backend ensures shift `opened_by` and `closed_by` always link to `public.users.id` rather than auth UUIDs, preventing foreign-key violations.
- **Custom JWT Claims**: Emitted by custom access token hook or resolved via `public.users` table:
  - `role_app`: `OWNER`, `STAFF`, `CUSTOMER`, `SUPPORT`
  - `tenant_id`: Mandatory tenant UUID scope
  - `branch_id`: Mandatory for STAFF; optional for OWNER (can switch branches)

### Live Verification Matrix
1. **Valid Login**:
   - `owner.runtime@example.com` -> Logged in; returned claims: `role_app: OWNER`, `tenant_id: 11111111-1111-1111-1111-111111111111`.
   - `staff.runtime@example.com` -> Logged in; returned claims: `role_app: STAFF`, `branch_id: 22222222-2222-2222-2222-222222222222`.
   - `phat.test@example.com` -> Logged in; returned claims: `role_app: CUSTOMER`.
2. **Invalid Password**:
   - Tested invalid password against `staff.runtime@example.com`.
   - Result: HTTP 401 with standard envelope `ERR_1004_INVALID_CREDENTIALS` ("Email hoặc mật khẩu không chính xác").
3. **Missing Token**:
   - Tested unauthenticated request to protected route `GET /api/v1/auth/me`.
   - Result: HTTP 401 with `ERR_1001_UNAUTHORIZED`.
4. **Token Propagation**:
   - Frontend `apiClient` interceptor automatically attaches `Bearer <token>` from `@fnb/utils` `authStore`.
   - Redundant prefixes (`/api/v1/api/v1/...`) are stripped automatically by the interceptor.
5. **Cross-Tenant & Cross-Branch Isolation**:
   - RLS strictly enforces tenant scoping on all Supabase user-client queries.
   - Staff attempting to access or modify orders/shifts outside `branch_id` is rejected with `ERR_9001_VALIDATION_FAILED`.

---

## 7. BUSINESS LOGIC AUDIT & RUNTIME TEST EVIDENCE

Real runtime tests were executed against the live backend server (`http://localhost:3001/api/v1`), Supabase database, and Redis.

### Comprehensive Test Suite Results: 29 / 29 PASS (0 FAIL, 0 BLOCKED)

| # | Verified Workflow / Invariant | Method & Endpoint | Payload / Details | Observed Response / State | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | Staff Auth Claims | `GET /auth/me` | Bearer Staff Token | `role=STAFF, tenant=1111..., branch=2222...` | **PASS** |
| **2** | Current Shift Check / Auto-open | `GET /shifts/current` | Bearer Staff Token | Shift `status=OPEN, branch_id=2222...` | **PASS** |
| **3** | Catalog & Products Discovery | `GET /products` | Tenant scoped | 8 seeded products found; selected product `df52e705...` (Bạc xỉu) | **PASS** |
| **4** | Floor & Table Discovery | `GET /floors`, `GET /floors/:id/tables` | `branch_id=2222...` | Floor `Tầng trệt`, Table `B02`, status `AVAILABLE` | **PASS** |
| **5A**| TAKEAWAY Order Creation | `POST /orders` | `{ order_type: 'TAKEAWAY' }` | `table_id = null`, `shift_id` linked to open shift | **PASS** |
| **5B**| Add Item to TAKEAWAY | `POST /orders/:id/items` | `product_id, quantity: 1` | Item added, subtotal updated | **PASS** |
| **5C**| Submit TAKEAWAY to Kitchen | `POST /orders/:id/submit-kitchen` | None | Status progressed to `IN_PROGRESS` | **PASS** |
| **5D**| Pay TAKEAWAY Order | `POST /orders/:id/pay` | `{ payment_method: 'VIETQR' }` | `200 OK`, `Đã thanh toán thành công` | **PASS** |
| **5E**| TAKEAWAY Order Completion | `GET /orders/:id` | None | Order status verified as `COMPLETED` | **PASS** |
| **6A**| DINE_IN Order Creation | `POST /orders` | `{ order_type: 'DINE_IN', table_id }` | Valid `table_id`, linked `shift_id` | **PASS** |
| **6B**| Add Items to DINE_IN | `POST /orders/:id/items` | `product_id, quantity: 2` | 2x Bạc xỉu added | **PASS** |
| **6C**| Submit DINE_IN to Kitchen | `POST /orders/:id/submit-kitchen` | None | KDS ticket generated | **PASS** |
| **6D**| KDS Snapshot Query | `GET /orders/kds` | Staff token | Active kitchen tickets list returned | **PASS** |
| **6E**| KDS State Machine Transitions | `PATCH /orders/:id/items/:itemId/kitchen-status` | `QUEUED -> PREPARING -> READY -> SERVED` | Sequential valid state updates succeed | **PASS** |
| **6F**| Invalid KDS Transition Rejection | `PATCH /orders/:id/items/:itemId/kitchen-status` | `SERVED -> PREPARING` | Correctly rejected: `Chuyển trạng thái bếp không hợp lệ từ SERVED sang PREPARING` | **PASS** |
| **6G**| Pay DINE_IN Order | `POST /orders/:id/pay` | `{ payment_method: 'VIETQR' }` | Order marked `COMPLETED` | **PASS** |
| **6H**| Table Auto-Free Upon Payment | `GET /floors/:id/tables` | Table query | Table status automatically reverted to `AVAILABLE` | **PASS** |
| **7** | Inventory Transaction Ledger | `GET /inventory/transactions` | Owner token | Ledger records verified, `ORDER_CONSUMPTION` recorded | **PASS** |
| **8A**| Shift Close | `POST /shifts/:id/close` | `{ ending_cash: 500000 }` | Shift closed and audited | **PASS** |
| **8B**| Verify Shift Closed | `GET /shifts/current` | Staff token | Returns `data: null` | **PASS** |
| **8C**| Payment Rejection Without Shift | `POST /orders/:id/pay` | `{ payment_method: 'VIETQR' }` | Strictly rejected: `[ERR_9001_VALIDATION_FAILED] Không thể thanh toán đơn hàng khi chưa mở ca làm việc` | **PASS** |
| **8D**| Re-open Shift | `POST /shifts/open` | `{ starting_cash: 500000 }` | New shift successfully opened | **PASS** |
| **9A**| Customer Wallet Balance | `GET /wallet` | Customer token | Real wallet returned: `main_balance: 0, promo_balance: 0` | **PASS** |
| **9B**| Customer Wallet Transactions | `GET /wallet/transactions` | Customer token | Real transaction history list returned | **PASS** |
| **9C**| CSAT Feedback Submission | `POST /support/csat` | `{ order_id, score: 5, complaint_note }` | Feedback submitted, support ticket generated | **PASS** |
| **10A**| Support Ticket Queue | `GET /support/tickets` | Owner/Support token | Support tickets query verified | **PASS** |
| **10B**| Unmatched Transactions Queue | `GET /support/unmatched` | Owner/Support token | Error queue query verified | **PASS** |
| **10C**| CDP Customer Profiles | `GET /cdp/customers?segment=ALL` | Owner token | Tenant customers queried | **PASS** |
| **10D**| Owner Analytics Dashboard | `GET /reports/dashboard` | Owner token | Aggregate business metrics loaded | **PASS** |

---

## 8. AUTOMATED TEST SUITES & BUILD VERIFICATION

### 1. Backend Vitest Suite
```bash
npm --prefix backend/api run test -- --run
```
* **Result**: `Test Files: 14 passed (14) | Tests: 200 passed (200)`
* Duration: 3.10s

### 2. Workspace Monorepo Vitest Suite
```bash
npx vitest run
```
* **Result**: `Test Files: 26 passed (26) | Tests: 237 passed (237)`
* Duration: 3.96s

### 3. Production Compilation Builds
* **`backend/api` (`nest build`)**: Succeeded without warnings.
* **`apps/staff-dashboard` (`vite build`)**: Transformed 3993 modules, built in 623ms.
* **`apps/customer-pwa` (`next build`)**: 16 static/dynamic routes compiled cleanly.

---

## 9. EXACT MODIFIED FILES

### Monorepo & Shared Packages
* `packages/utils/tsconfig.json`: Added standard tsconfig extending base.
* `packages/ui-shared/tsconfig.json`: Enabled project references and root directory resolution.
* `packages/utils/src/api-client.ts`: Fixed Axios 1.x header type mismatch and base URL resolution.
* `packages/utils/src/auth-store.ts`: Added `branch_id` and `tenant_id` to `UserProfile`.
* `packages/utils/src/theme.test.ts`: Fixed test mock expectation.

### Backend (`backend/api`)
* `backend/api/src/common/redis.service.ts`: Added error event listener on Redis client and resilient reconnect options to prevent unhandled ECONNRESET process crashes.
* `backend/api/src/modules/shift/dto/open-shift.dto.ts`: Added `@IsOptional()` to `branch_id`; added `initial_cash` alias.
* `backend/api/src/modules/shift/dto/close-shift.dto.ts`: Added `final_cash` alias for compatibility.
* `backend/api/src/modules/shift/shift.service.ts`: Handled aliases `starting_cash ?? initial_cash` and `ending_cash ?? final_cash`.
* `backend/api/src/modules/cdp/dto/list-customers-query.dto.ts`: Made `segment` optional and allowed `'ALL'`.
* `backend/api/src/modules/cdp/dto/dashboard-query.dto.ts`: Made `branch_id` optional with tenant fallback.
* `backend/api/src/modules/cdp/cdp.service.ts`: Handled `'ALL'` segment query and optional branch filtering.

### Frontend (`apps/staff-dashboard`)
* `apps/staff-dashboard/src/types.d.ts`: Added module declarations for lucide-react.
* `apps/staff-dashboard/src/store/supportStore.ts`: Replaced mock data with real support APIs.
* `apps/staff-dashboard/src/store/ticketStore.ts`: Replaced mock data with real ticket APIs.
* `apps/staff-dashboard/src/components/support/MergeCustomerModal.tsx`: Wired to real CDP merge endpoint.
* `apps/staff-dashboard/src/store/shiftStore.ts`: Replaced `mockShifts` with real shift APIs.
* `apps/staff-dashboard/src/pages/ShiftManagement.tsx`: Updated payload fields to `starting_cash` / `ending_cash` and real branch UUID.
* `apps/staff-dashboard/src/store/cdpStore.ts`: Wired to real CDP customer listing and 360 view.
* `apps/staff-dashboard/src/store/analyticsStore.ts`: Wired to real `/reports/dashboard` API.
* `apps/staff-dashboard/src/store/inventoryStore.ts`: Wired to real ingredient and transaction APIs.
* `apps/staff-dashboard/src/pages/POS.tsx`: Fixed menu endpoints, order creation, item addition, kitchen submission, and payment.
* `apps/staff-dashboard/src/components/StaffAuthProvider.tsx`: Propagated `profile.id` and branch UUIDs correctly.

### Frontend (`apps/customer-pwa`)
* `apps/customer-pwa/src/types.d.ts`: Added module declarations for Next.js navigation.
* `apps/customer-pwa/src/components/AuthProvider.tsx`: Propagated authenticated customer user state.
* `apps/customer-pwa/src/app/wallet/page.tsx`: Replaced mock balances with real `GET /wallet`, `GET /wallet/transactions`, and `GET /wallet/vouchers`.
* `apps/customer-pwa/src/app/menu/page.tsx`: Replaced mock tenant query with seeded tenant `cafe-and-cake`.
* `apps/customer-pwa/src/components/FeaturedMenuSection.tsx`: Replaced mock tenant query.
* `apps/customer-pwa/src/components/group-order/GroupMenuPicker.tsx`: Replaced mock tenant query.

---

## 10. HANDOFF INSTRUCTIONS FOR FE1

### For FE1: How to Pull and Continue UI Development
1. Ensure your local branch `FE` has no uncommitted changes (`git status`).
2. Pull the integrated changes from branch `BE`:
   ```bash
   git fetch origin
   git merge origin/BE
   ```
3. Install any updated dependencies and verify workspace builds:
   ```bash
   npm install
   npm run build
   ```
4. **Environment Variables**:
   - Ensure `apps/staff-dashboard/.env` and `apps/customer-pwa/.env.local` point `VITE_API_URL` / `NEXT_PUBLIC_API_URL` to `http://localhost:3001/api/v1`.
5. **Seeded Test Accounts for Local Testing**:
   - **Owner**: `owner.runtime@example.com` / `Password123!`
   - **Staff**: `staff.runtime@example.com` / `Password123!`
   - **Customer**: `phat.test@example.com` / `Password123!`
   - **Seeded Tenant**: Subdomain `cafe-and-cake` (ID: `11111111-1111-1111-1111-111111111111`)
   - **Seeded Branch**: Branch 1 (ID: `22222222-2222-2222-2222-222222222222`)
6. **Key Guidelines for Continuing UI Development**:
   - Do **NOT** re-introduce `setTimeout` mock fallbacks. If an API request fails, render an explicit error or empty state.
   - For orders, `POST /orders` returns `{ success: true, data: { order_id, order_code } }`. Note that the returned key is `order_id`.
   - For wallets, `GET /wallet` returns `{ main_balance, promo_balance }`.
   - For payment, `POST /orders/:id/pay` accepts `payment_method` enum values: `'VIETQR'`, `'WALLET'`, or `'COFFEE_PASS'`.
   - For shifts, a shift must be `OPEN` before completing payments.
