# PLAN_FE.md — Kế Hoạch Frontend

> Áp dụng cho 2 thành viên Frontend: **F1 (Operations FE)** và **F2 (Customer & Admin FE)**. Chia theo mức độ phức tạp thực tế thay vì chia đều theo số màn hình, để tổng khối lượng công việc cân bằng.
> Phụ thuộc: `API_CONTRACT.md`, `REALTIME_EVENTS.md`, `ERROR_CODES.md`, `CODING_CONVENTION.md` mục 2 (cấu trúc FE).

## 1. Phân chia màn hình

| | **F1 — Operations FE** | **F2 — Customer & Admin FE** |
|---|---|---|
| Ứng dụng | `apps/staff-dashboard` (một phần) | `apps/customer-pwa` (toàn bộ) + `apps/staff-dashboard` (phần còn lại) |
| Màn hình phụ trách | Floor Editor (kéo-thả Canvas/SVG), Live Floor Map, POS Order Screen, KDS theo `kitchen_station` (Bar + Kitchen) | Đặt bàn trực quan, Public Menu & Giỏ hàng, Group-Order, Ví trả trước (số dư + lịch sử giao dịch), Voucher, Coffee Pass (TOTP), CSAT (đánh giá sau thanh toán), Menu Management (Owner), Staff Management (Owner), Analytics Dashboard, Support Board |
| Kênh realtime chính (`REALTIME_EVENTS.md`) | `tables:{branch_id}`, `kds:{branch_id}` | `tables:{branch_id}` (màn Đặt bàn + Support Board), `group_order:{tenant_id}:{table_id}`, `support:{tenant_id}` |
| Đặc điểm | Ít màn hình (4) nhưng mỗi màn hình đòi hỏi thao tác kéo-thả/canvas phức tạp và realtime độ trễ thấp là yếu tố sống còn (sai 1 giây là staff thao tác nhầm bàn) | Nhiều màn hình (11) nhưng phần lớn là form/list chuẩn; điểm khó tập trung ở đồng bộ giỏ hàng chung (Group-Order) và sinh/verify mã TOTP |
| Điểm khối lượng công việc (ước lượng) | Floor Editor: 3, Live Floor Map: 2, POS: 2, KDS: 2 = **9 điểm** | Đặt bàn: 2, Menu/Cart: 1, Group-Order: 3, Wallet+Voucher: 1, Coffee Pass: 2, CSAT: 1, Menu Mgmt: 1, Staff Mgmt: 1, Analytics: 1, Support Board: 2 = **15 điểm**, nhưng đa số mục nhẹ (1 điểm) làm nhanh nên tổng thời gian quy đổi **tương đương F1** |

## 2. Nhiệm vụ chi tiết và đầu ra

### F1 — Operations Frontend

**Vai trò trong nhóm:** phụ trách giao diện vận hành tại nhà hàng và các thao tác cần realtime, Canvas/SVG hoặc nhiều trạng thái liên tục.

**Role nghiệp vụ phục vụ:** `STAFF` là chính; hỗ trợ giao diện `OWNER` ở Floor Editor và dùng chung component sơ đồ bàn cho `CUSTOMER`, `SUPPORT`.

**Nhiệm vụ bắt buộc:**

- Xây dựng `FloorMapCanvas.tsx` dùng chung cho Floor Editor, đặt bàn và Support Board.
- Làm Floor Editor: xem, tạo, sửa tầng/bàn; kéo thả; chỉnh kích thước, hình dạng và tọa độ.
- Làm Live Floor Map: hiển thị màu theo trạng thái bàn và subscribe `tables:{branch_id}`.
- Làm POS: chọn bàn, tạo order, thêm/sửa món, gửi bếp và thanh toán.
- Làm KDS Bar và KDS Kitchen: nhận `kds_new_ticket`, lọc theo station và cập nhật trạng thái món.
- Xử lý reconnect, loading, empty state, lỗi API và quyền truy cập trong staff dashboard.
- Bàn giao component sơ đồ bàn, hooks realtime và hướng dẫn tích hợp cho F2.
- Tạo và publish `packages/ui-shared/src/FloorMapCanvas.tsx`; F2/Customer PWA import package này, không import từ `staff-dashboard`.
- Dùng `STAFF` cho KDS trong MVP; lọc Bar/Kitchen bằng `categories.kitchen_station`, không tạo role `KITCHEN`/`BAR`.

**Đầu ra cần bàn giao:** staff dashboard có Floor Editor, Live Floor Map, POS, KDS; component sơ đồ bàn tái sử dụng; API/realtime client; checklist test hai tab và test chuyển trạng thái bàn.

**Điều kiện hoàn thành:** nhân viên có thể đi từ check-in đến gửi bếp và thanh toán; trạng thái bàn cập nhật đúng khi thay đổi từ tab khác; món xuất hiện đúng màn hình Bar/Kitchen.

### F2 — Customer & Admin Frontend

**Vai trò trong nhóm:** phụ trách toàn bộ trải nghiệm khách hàng và các màn hình quản trị, CSKH trong `customer-pwa` và phần còn lại của `staff-dashboard`.

**Role nghiệp vụ phục vụ:** `CUSTOMER` là chính; xây dựng màn hình cho `OWNER` và `SUPPORT`, đồng thời phối hợp với `STAFF` ở group-order và thanh toán.

**Nhiệm vụ bắt buộc:**

- Xây dựng Customer PWA: đăng nhập, xem sơ đồ bàn, khóa bàn và hiển thị VietQR mock.
- Làm Menu/Cart và Group-Order: tham gia session, cập nhật giỏ hàng chung, hiển thị người thêm món và xử lý reconnect.
- Làm Wallet/Voucher: số dư, nạp ví mock, lịch sử giao dịch và voucher.
- Làm Coffee Pass: danh sách gói, mua gói và hiển thị mã TOTP xoay 30 giây.
- Làm luồng thanh toán và CSAT sau khi order hoàn tất.
- Làm Menu Management và Staff Management cho `OWNER`.
- Làm Analytics Dashboard và hồ sơ/CDP khách hàng.
- Làm Support Board cho `SUPPORT`: giao dịch lỗi, fuzzy-match suggestions, Maker-Checker, ticket khẩn cấp và voucher.
- Xử lý phân quyền theo `role_app`, response/error code, responsive layout và trạng thái loading/error/empty.
- F2 sở hữu auth/session, API client, response envelope và 401/403 handling dùng chung cho cả hai frontend; F1 sử dụng lại.
- Customer MVP không tự tạo order độc lập; Staff check-in tạo order trước, Customer dùng group-order/thanh toán order hiện có.

**Đầu ra cần bàn giao:** Customer PWA hoàn chỉnh, các màn hình Admin/Support, group-order realtime, wallet/Coffee Pass/CSAT UI và bộ route guard theo role.

**Điều kiện hoàn thành:** khách có thể đặt bàn, gọi món nhóm và thanh toán; Owner quản lý được menu/nhân viên/báo cáo; Support xử lý được unmatched transaction và ticket CSAT trên dữ liệu thật.

## 3. Lộ trình 8 tuần

### Tuần 1-2 — Khung sườn & chờ hạ tầng
**F1 & F2 (chung):**
- Dựng khung 2 app (Vite React cho staff-dashboard, Next.js cho customer-pwa) theo `CODING_CONVENTION.md` mục 2.1
- Setup `lib/api-client.ts` (axios/fetch wrapper đọc `error.code` theo `ERROR_CODES.md`) và `lib/realtime-client.ts` (Supabase Realtime + Socket.IO client)
- Dựng UI tĩnh (chưa gọi API thật) dựa trên mockdata, chờ backend B1 xong Auth + Floor (tuần 2)

### Tuần 3-4 — Tích hợp API lõi
**F1:** Floor Editor (đọc/ghi `GET/POST /floors`, `/tables`) — chưa cần realtime, dùng REST trước; bắt đầu Live Floor Map subscribe `tables:{branch_id}` ngay khi B1 bật Realtime
**F2:** Đặt bàn trực quan (đọc sơ đồ từ API của F1/B1, gọi `/reservations/lock`, hiển thị QR mock); Menu & Cart cơ bản; Menu Management (Owner CRUD `categories`/`products`)

### Tuần 5-6 — Realtime nâng cao
**F1:** POS Order Screen hoàn chỉnh (`/orders/*`) + KDS 2 màn hình, gọi snapshot `GET /orders/kds` và xử lý `kds_new_ticket`/`kds_item_status_changed`
**F2:** Group-Order (đồng bộ giỏ hàng chung qua `group_order_cart_updated`, xử lý reconnect theo `REALTIME_EVENTS.md` mục 3); Wallet (số dư, lịch sử giao dịch, voucher) + Coffee Pass (hiển thị mã TOTP xoay 30s); màn hình gửi CSAT sau thanh toán

### Tuần 7 — Màn hình quản trị
**F2:** Analytics Dashboard (`/reports/dashboard`, `/cdp/*`), Staff Management (Owner CRUD `/staff/*`), Support Board (`/support/*`, xử lý `unmatched_transaction_created`/`support_ticket_urgent_created`)
**F1:** Hỗ trợ F2 phần UI chung (component dùng lại giữa Floor Editor và Support Board — cả 2 đều hiển thị sơ đồ bàn 2D)

### Tuần 8 — Test & demo
Cả 2: test 2 tab đồng thời cho mọi luồng realtime (đổi bàn, group-order, ticket khẩn cấp), polish UI theo `frontend-design` guideline, chuẩn bị kịch bản demo

## 4. Quy tắc phối hợp

- Component sơ đồ bàn 2D (Canvas/SVG) chỉ viết **1 lần** dùng chung: F1 xây dựng component gốc (`FloorMapCanvas.tsx`) trong `packages/ui-shared/` (nếu setup monorepo) hoặc copy có kiểm soát; F2 tái sử dụng cho màn hình Đặt bàn và Support Board — tránh 2 người viết lại logic vẽ Canvas 2 lần
- Không tự chế thêm field response ngoài `API_CONTRACT.md` — nếu thiếu field, báo backend (B1/B2) thêm vào, không tự suy đoán
- F1 và F2 review chéo PR của nhau, đặc biệt phần dùng chung (`api-client.ts`, `realtime-client.ts`, `FloorMapCanvas.tsx`)
