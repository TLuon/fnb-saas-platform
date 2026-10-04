# SPEC.md — Đặc Tả Nghiệp Vụ

**Dự án:** Nền tảng F&B SaaS Đa Người Dùng Tích Hợp Bản Đồ Không Gian Thời Gian Thực Và Hệ Thống Quản Trị Vòng Đời Khách Hàng (CDP/CRM)
**Đồ án môn:** Công Nghệ Phần Mềm (CNPM)
**Demo qua use case:** Quán cà phê (source code dùng chung, tái cấu hình được cho nhiều cửa hàng)
**Nhóm:** 4 thành viên (xem `TASK_ASSIGNMENT.md`)

> File này là nguồn tham chiếu nghiệp vụ gốc. Mọi file khác (`ERD.md`, `API_CONTRACT.md`, `REALTIME_EVENTS.md`...) phải khớp với tên bảng, tên trạng thái (status) và tên vai trò được định nghĩa tại đây.

---

## 1. Bối cảnh & mục tiêu

Giải quyết 3 vấn đề vận hành thực tế của quán F&B:
1. Tắc nghẽn tại điểm bán giờ cao điểm (xếp hàng, gọi món, chờ hóa đơn).
2. Quản lý sơ đồ bàn thủ công → đặt trùng bàn, không cập nhật kịp trạng thái.
3. Rời rạc giữa thanh toán chuyển khoản (VietQR) và chăm sóc khách hàng → đối soát thủ công, thất thoát.

Giải pháp: nền tảng **đa thuê bao (multi-tenant)** kết nối 4 nhóm vai trò theo thời gian thực, dùng bản đồ bàn 2D + VietQR tự động đối soát + CDP/CRM.

## 2. Bốn vai trò (Roles)

Giá trị `role` dùng trong nghiệp vụ và cột `users.role`; JWT dùng claim `role_app` để tránh trùng claim `role` mặc định của Supabase:

| Mã role (dùng trong code) | Tên hiển thị | Mô tả |
|---|---|---|
| `OWNER` | Chủ nhà hàng / Quản lý | Toàn quyền cấu hình chi nhánh, thực đơn, kho, nhân sự, báo cáo tài chính, CDP |
| `STAFF` | Nhân viên thu ngân / Phục vụ | Sơ đồ bàn realtime, tạo order, gửi bếp (KDS), thanh toán tại quầy |
| `CUSTOMER` | Khách hàng | Đặt bàn, gọi món nhóm, ví trả trước, Coffee Pass, thanh toán VietQR |
| `SUPPORT` | Chăm sóc khách hàng (CSKH) | Tra soát giao dịch lỗi, Maker-Checker, xử lý CSAT thấp, merge hồ sơ khách |

## 3. Phạm vi MVP (In scope cho đồ án)

Được triển khai **thật** (có DB, API, realtime thật):
- Auth + RBAC + multi-tenant RLS
- Floor Editor (CRUD sơ đồ bàn) + Live Floor Map realtime (Supabase Realtime)
- Đặt bàn + khóa tạm thời vị trí (giả lập Redlock bằng Redis lock đơn giản, TTL 10 phút)
- Sinh mã VietQR (dùng thư viện tạo QR text theo chuẩn VietQR, **webhook giả lập** thay vì tích hợp ngân hàng thật)
- Tạo order tại bàn + Gọi món nhóm (Group-Order qua Redis session) + đẩy KDS qua WebSocket
- Thanh toán (VietQR mock / trừ Ví trả trước) + Trigger cập nhật CDP cơ bản (total_spent, loyalty_points, membership_tier)
- Module CSKH cơ bản: hàng đợi giao dịch lỗi + so khớp mờ bằng PostgreSQL `pg_trgm` (thay cho Levenshtein thuần, xem `ERD.md` mục 3.2) + Maker-Checker 2 cấp
- Dashboard báo cáo cơ bản (doanh thu, tỷ lệ lấp đầy bàn)

Triển khai **rút gọn / demo bằng 1 use case nhỏ** (không cần tổng quát hóa toàn bộ):
- Coffee Pass TOTP (chỉ cần 1 gói minh họa, mã xoay 30s)
- Phân khúc RFM (chạy 1 lần bằng SQL query định kỳ, không cần job scheduler phức tạp)
- Sổ cái kép (Double-Entry Ledger) — chỉ tách 2 loại: doanh thu thực vs. chi phí marketing
- Closed-loop CSAT (một luồng: đơn hàng completed → khảo sát → ticket nếu ≤2 sao)

Ngoài phạm vi (Out of scope):
- Tích hợp cổng thanh toán ngân hàng thật (SePay/NAPAS)
- App di động native (chỉ làm Web/PWA)
- Multi-branch inventory forecasting nâng cao

## 4. Năm giai đoạn vận hành (End-to-End)

Tham chiếu chi tiết endpoint tại `API_CONTRACT.md`, sự kiện realtime tại `REALTIME_EVENTS.md`.

### Giai đoạn 1 — Xác thực & điều hướng ngữ cảnh
Đăng nhập → JWT chứa `role_app`, `tenant_id`, `branch_id` → FE điều hướng theo `role_app`.

### Giai đoạn 2 — Đặt bàn & khóa vị trí realtime
Khách chọn bàn trên Canvas 2D → `POST /reservations/lock` (TTL 10 phút, Redis key `lock:table:{table_id}`) → sinh mã VietQR cọc → chờ webhook (mock) → cập nhật `tables.status = RESERVED` → giải phóng lock → broadcast realtime.

### Giai đoạn 3 — Check-in, gọi món nhóm, KDS
Staff quét QR check-in → `tables.status = OCCUPIED`, tạo `orders` mới → khách quét QR tĩnh tại bàn tham gia session Redis chung (`session:{tenant_id}:{table_id}`) → gửi bếp → `order_items` tách theo `category` (BAR/KITCHEN) → đẩy qua WebSocket đến KDS.

### Giai đoạn 4 — Thanh toán & CDP
Thanh toán (VietQR / Ví trả trước / Coffee Pass) → `orders.status = COMPLETED` → Postgres Trigger `trg_order_completed` tự cập nhật `customers.total_spent`, `loyalty_points`, `membership_tier`, ghi `loyalty_transactions`.

### Giai đoạn 5 — CSKH xử lý ngoại lệ
- **Luồng A:** giao dịch VietQR không khớp → vào `unmatched_transactions` → so khớp mờ `pg_trgm` gợi ý khách hàng → Maker tạo đề xuất → Checker duyệt → ghi `audit_logs`.
- **Luồng B:** CSAT ≤ 2 sao → tạo `support_tickets` (URGENT) → CSKH xử lý, phát `customer_vouchers` đền bù.

## 5. Trạng thái chuẩn hóa (Status enums)

| Entity | Cột | Giá trị |
|---|---|---|
| `tables` | `status` | `AVAILABLE`, `PENDING_LOCK`, `RESERVED`, `OCCUPIED`, `CLEANING` |
| `orders` | `status` | `PENDING`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED` |
| `order_items` | `kitchen_status` | `QUEUED`, `PREPARING`, `READY`, `SERVED` |
| `payment_transactions` | `status` | `PENDING`, `MATCHED`, `UNMATCHED`, `COMPLETED`, `FAILED` |
| `unmatched_transactions` | `status` | `PENDING`, `PROPOSED`, `APPROVED`, `REJECTED` |
| `support_tickets` | `status` | `OPEN`, `IN_PROGRESS`, `RESOLVED` |
| `support_tickets` | `priority` | `NORMAL`, `URGENT` |
| `wallet_transactions` | `type` | `TOPUP`, `PAYMENT`, `REFUND`, `PROMO_CREDIT` |
| `loyalty_transactions` | `type` | `EARN`, `REDEEM` |
| `customers` | `membership_tier` | `STANDARD`, `SILVER`, `GOLD`, `DIAMOND` |

## 6. Yêu cầu phi chức năng

- Cách ly dữ liệu tuyệt đối giữa các tenant (RLS bắt buộc, xem `RLS_POLICIES.md`)
- Độ trễ cập nhật realtime mục tiêu < 1s (đồ án, không cần <50ms như bản thương mại)
- Toàn bộ business logic tính điểm/nâng hạng thực hiện tại tầng DB (Trigger) để đảm bảo nhất quán dù client nào gọi vào
