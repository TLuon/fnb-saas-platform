# PLAN_BE.md — Kế Hoạch Backend

> Cập nhật cơ cấu nhóm: thay vì chia theo 4 vai trò nghiệp vụ (xem `TASK_ASSIGNMENT.md` — nay chỉ còn giá trị tham chiếu module↔nghiệp vụ), nhóm chia theo **2 nửa BE/FE**. File này áp dụng cho 2 thành viên Backend, gọi là **B1 (DB Lead)** và **B2 (Backend Dev)**.
> Phụ thuộc: `ERD.md`, `RLS_POLICIES.md`, `API_CONTRACT.md`, `REALTIME_EVENTS.md`, `ERROR_CODES.md`, `CODING_CONVENTION.md`.

## 1. Nguyên tắc "1 DB dùng chung"

- **B1 là người duy nhất tạo/sửa schema** (bảng, cột, index, RLS policy, trigger, function trong `ERD.md`/`RLS_POLICIES.md`). Không ai khác tự ý `CREATE TABLE`/`ALTER TABLE` trên Supabase project chung.
- Nếu B2 (hoặc FE) cần thêm cột/bảng mới phát sinh trong lúc code, **báo B1** → B1 cập nhật `ERD.md` trước → chạy migration → thông báo cả nhóm mới được dùng.
- B1 quản lý thư mục `apps/api/database/migrations/` với các file đánh số thứ tự (`001_init.sql`, `002_add_xxx.sql`...) để cả nhóm biết lịch sử thay đổi, tránh chạy tay lệch nhau giữa các máy.
- Toàn bộ nhóm dùng chung **1 Supabase project** (không tạo project riêng để test) — thông tin kết nối lấy từ `SETUP.md`.

## 2. Phân chia module

| | **B1 — DB Lead + Backend** | **B2 — Backend Dev** |
|---|---|---|
| Hạ tầng DB | Toàn bộ `ERD.md` (DDL, trigger, function), toàn bộ `RLS_POLICIES.md`, seed data (`SETUP.md` mục 9) | Không đụng schema, chỉ dùng Supabase client theo bảng B1 đã tạo |
| Module API (`API_CONTRACT.md`) | Auth (`/auth/*`), Floor & Table (`/floors/*`, `/tables/*`), Menu (`/categories/*`, `/products/*`), Staff Management (`/staff/*`), CDP/Reporting (`/cdp/*`, `/reports/*`) | Reservation & Payment (`/reservations/*`), Order/POS + KDS (`/orders/*`), Group-Order (`/group-order/*`), Wallet & Coffee Pass (`/wallet/*`, `/coffee-pass/*`), Support/CSKH (`/support/*`, gồm cả `/support/csat`) |
| Hạ tầng dùng chung | `common/` (guard, decorator, `ResponseInterceptor`), cấu hình Redis client wrapper (B2 dùng lại) | — |
| Điểm khối lượng công việc (ước lượng, 1 = nhẹ, 3 = nặng) | DB infra: 3 + Auth: 1 + Floor: 2 + Menu: 1 + Staff: 1 + CDP: 2 = **10 điểm** | Reservation: 3 + Order/KDS: 2 + Group-Order: 2 + Wallet/CoffeePass: 2 + Support: 3 = **12 điểm**, nhưng B1 làm hạ tầng DB trước nên B2 chỉ code nghiệp vụ thuần, không tốn thời gian dựng infra → tổng effort quy đổi ra thời gian **tương đương nhau** |

> Vì sao B1 có ít module hơn nhưng khối lượng vẫn tương đương: B1 gánh toàn bộ phần hạ tầng (schema, RLS, migration, guard chung) — việc B2 code nhanh được là nhờ dùng lại phần này. Nếu tính cả effort hạ tầng, 2 bên coi như ngang nhau ở đầu-cuối dự án.

## 3. Nhiệm vụ chi tiết và đầu ra

### B1 — Database Lead + Backend Core

**Vai trò trong nhóm:** chịu trách nhiệm về kiến trúc dữ liệu, bảo mật database và các API nền tảng. B1 là đầu mối duyệt mọi thay đổi schema trước khi nhóm sử dụng.

**Role nghiệp vụ phục vụ:** `OWNER` là chính; cung cấp hạ tầng xác thực và dữ liệu dùng chung cho `STAFF`, `CUSTOMER`, `SUPPORT`.

**Nhiệm vụ bắt buộc:**

- Dựng Supabase project, thư mục migration, seed data và tài liệu thay đổi schema.
- Tạo bảng, index, trigger, function và RLS policy theo `ERD.md` và `RLS_POLICIES.md`.
- Cấu hình Supabase Auth, `custom_access_token_hook`, JWT claims và các guard dùng chung.
- Hoàn thiện API Auth, Floor & Table, Menu, Staff Management, CDP và Reports.
- Tích hợp Supabase Realtime cho trạng thái bàn.
- Viết và kiểm thử trigger `trg_order_completed`, cập nhật loyalty và membership tier.
- Đảm bảo các API trả đúng response envelope và error code chuẩn.
- Review code B2 ở các phần liên quan đến query, tenant isolation và audit log.

**Đầu ra cần bàn giao:** thư mục migration chạy được theo thứ tự, seed data demo, JWT mẫu, API Auth/Floor/Menu/Staff/CDP/Reports, tài liệu schema cập nhật và checklist kiểm thử RLS.

**Điều kiện hoàn thành:** tenant này không đọc được dữ liệu tenant khác; các role bị chặn đúng quyền; FE có thể lấy sơ đồ bàn, menu, thông tin nhân viên và dashboard bằng API thật.

### B2 — Backend Business Flow

**Vai trò trong nhóm:** chịu trách nhiệm các luồng nghiệp vụ giao dịch, Redis, thanh toán mock và realtime do backend chủ động phát.

**Role nghiệp vụ phục vụ:** `CUSTOMER` và `STAFF` là chính; xây dựng các chức năng CSKH cho `SUPPORT` và quyền duyệt cho `OWNER`.

**Nhiệm vụ bắt buộc:**

- Hoàn thiện API Reservation & Payment: Redis lock TTL 10 phút, VietQR mock, webhook và unmatched transaction.
- Hoàn thiện API Order/POS/KDS: tạo order, thêm món, submit kitchen, cập nhật trạng thái món và thanh toán.
- Xây dựng Group-Order bằng Redis session, xác nhận giỏ hàng và ghi `order_items`.
- Xây dựng Wallet và Coffee Pass, bao gồm trừ ví theo thứ tự `PROMO` rồi `MAIN` và xác thực TOTP.
- Hoàn thiện Support/CSKH: fuzzy match, Maker-Checker, merge customer, CSAT, ticket khẩn cấp và voucher.
- Tích hợp Socket.IO cho KDS, Group-Order và Support Board.
- Ghi `audit_logs` cho topup, thanh toán, duyệt unmatched transaction và các thao tác tài chính.
- Không tự thay đổi schema; mọi nhu cầu thêm bảng/cột phải gửi B1 duyệt trước.

**Đầu ra cần bàn giao:** các module API nêu trên, Redis client dùng chung, event payload đúng `REALTIME_EVENTS.md`, DTO/error code đầy đủ và collection Postman/Thunder Client cho các luồng chính.

**Điều kiện hoàn thành:** xử lý đúng khóa bàn đồng thời, thanh toán thiếu số dư, TOTP hết hạn, group-order reconnect, self-approval và chuyển order sang `COMPLETED` để trigger CDP chạy.

## 4. Lộ trình 8 tuần

### Tuần 1-2 — Hạ tầng & khung sườn
**B1:**
- Dựng Supabase project, chạy toàn bộ DDL (`ERD.md`), bật RLS (`RLS_POLICIES.md`), cấu hình `custom_access_token_hook`
- Seed data mẫu quán cà phê (`SETUP.md` mục 9)
- Khung NestJS: `common/` (guard, `ResponseInterceptor`, exception filter theo `ERROR_CODES.md`), module `auth`
- Bàn giao cho cả nhóm: connection string, JWT mẫu để test Postman

**B2:**
- Trong lúc chờ B1 xong hạ tầng: dựng khung module rỗng (`reservation`, `order`, `group-order`, `wallet`, `support`) theo `CODING_CONVENTION.md` mục 1.1, viết DTO trước dựa trên `API_CONTRACT.md`
- Cấu hình Redis client (dùng chung cho Reservation lock + Group-Order session)

### Tuần 3-4 — Nghiệp vụ lõi
**B1:** Floor & Table CRUD, Menu CRUD (`categories`/`products`), tích hợp Supabase Realtime cho bảng `tables` (đủ để FE F1 bắt đầu subscribe kênh `tables:{branch_id}`)
**B2:** Reservation lock (Redis TTL 10 phút) + sinh mã VietQR mock + webhook mock-payment; Order/POS CRUD cơ bản + submit-kitchen

### Tuần 5-6 — Nghiệp vụ nâng cao & CDP
**B1:** Trigger `trg_order_completed`, Staff Management (`/staff/*`), CDP endpoints (RFM segmentation, hồ sơ 360), Analytics dashboard
**B2:** Group-Order session Redis hoàn chỉnh + broadcast; Wallet + Coffee Pass (TOTP); bắt đầu Support module (unmatched queue + fuzzy match)

### Tuần 7 — Hoàn thiện Support & tích hợp
**B1:** Hỗ trợ B2 hoàn thiện Maker-Checker (`fn_merge_customer_profiles`, audit log); rà soát lại toàn bộ RLS policy theo role (mục 5 `RLS_POLICIES.md`)
**B2:** Hoàn thiện Support/CSKH (Maker-Checker, closed-loop CSAT), viết lại DTO theo phản hồi từ FE nếu lệch `API_CONTRACT.md`

### Tuần 8 — Test & demo
Cả 2: test tay các race condition (khóa bàn trùng, self-approval), phối hợp FE fix lỗi tích hợp, chuẩn bị data demo sạch

## 5. Quy tắc phối hợp

- Mọi thay đổi `API_CONTRACT.md` (thêm/sửa field response) phải thông báo FE ngay trong ngày, không để đến cuối tuần
- B2 không tạo bảng mới khi cần lưu trạng thái tạm — ưu tiên Redis trước, chỉ xin B1 thêm cột/bảng Postgres nếu dữ liệu cần tồn tại lâu dài (qua hạn Redis TTL)
- Code review chéo: B1 review PR của B2 và ngược lại, bắt buộc trước khi merge `main`
