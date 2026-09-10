# Roadmap & Handover cho Đội F1 (Bếp, KDS, Group-Order Backend)

Tài liệu này ghi chú lại các thành quả của đội F2 (Customer & Admin Frontend) và đóng vai trò như bản đồ dẫn đường (roadmap) để đội F1 (KDS, Bếp, Backend) tiếp nhận dự án, đồng bộ hóa và phát triển tiếp tục.

---

## 1. Những gì F2 đã hoàn thành (Base & Frontend)

F2 đã thiết lập xong toàn bộ phần nền móng Frontend và logic Client-side cho dự án:

1. **Kiến trúc Monorepo & Core Logic (`packages/utils`)**:
   - Hoàn thiện `api-client`: Đã cấu hình axios instance, tự động đính kèm JWT (Authorization Bearer), và bắt lỗi theo chuẩn `ERROR_CODES.md`.
   - Hoàn thiện `realtime-client`: Xử lý kết nối Supabase Realtime (với token auth) và Socket.IO.
   - Các tiện ích khác: `auth` (parse JWT), `totp` (thuật toán mã dùng 1 lần cho Coffee Pass), `theme` (quản lý bảng màu).
   - **Tất cả các module trên đều đã được phát triển theo TDD và đạt pass test 100%.** F1 có thể import và dùng ngay: `import { apiClient, realtimeClient } from '@fnb/utils'`.

2. **Customer PWA (Next.js)**:
   - Đã hoàn thiện toàn bộ luồng Đặt bàn, Quét QR Group-Order, Xem Thực đơn, Giỏ hàng chung, Thanh toán (Ví, Coffee Pass) và Đánh giá (CSAT).
   - Giao diện được thiết kế hiện đại, mượt mà với Glassmorphism (Sơ đồ bàn), Punch-hole CSS (vé Coffee Pass).

3. **Staff Dashboard (Vite + React + Tailwind)**:
   - Xây dựng bộ khung Layout chuẩn với Sidebar và Header phân quyền động (`OWNER` vs `SUPPORT`).
   - Đã hoàn thiện các trang quản trị cốt lõi: Menu, Staff, CDP, Analytics, Support Board (Maker-Checker), Support Tickets.

4. **Hệ thống Thiết kế (Design System)**:
   - Đã quy hoạch toàn bộ màu sắc về biến CSS (CSS Variables) như `var(--color-brand-primary)`, `var(--color-brand-secondary)`, `var(--color-brand-accent)` trong `globals.css` / `index.css`.
   - Thiết lập Typography cao cấp (`Playfair Display` & `Plus Jakarta Sans`).
   - **Tuyệt đối không còn hardcode mã Hex màu trong dự án.**

---

## 2. Liên kết giữa F2 và F1

Các tính năng mà F2 đã xây dựng UI/Mock logic sẽ là đầu vào (Input) cho công việc của F1:

- **Group-Order (Mã nguồn F2 đã sẵn sàng):** F2 đã làm giao diện người dùng quét QR, hiển thị "ai đặt món gì", và kết nối Socket.IO mock. -> **F1 cần:** Code Backend (Node.js/Socket.IO) để xử lý logic gộp giỏ hàng thật và phát (emit) sự kiện đồng bộ.
- **Thanh toán & CSAT (F2 đã làm luồng):** Khi khách thanh toán xong PWA sẽ gửi API tạo đơn hàng. -> **F1 cần:** Nhận Webhook/API báo đơn thành công để đẩy đơn đó xuống màn hình Bếp (KDS).
- **Core API & Realtime (F2 đã làm SDK):** F1 KHÔNG CẦN viết lại hàm fetch hay kết nối websocket. Chỉ cần gọi các module từ `@fnb/utils` để bắt sự kiện (ví dụ: nghe sự kiện `new_order` từ bếp).

---

## 3. Nội dung gói Bàn giao (Handover Package - Mục 8 của F2)

F2 sẽ bàn giao các hạng mục sau để F1 sẵn sàng code ngay mà không vướng bận setup:

1. **Mã nguồn đã được dọn dẹp:** Lịch sử Git sạch sẽ (sẽ push lên branch `dev`), không còn lỗi build, test xanh 100%.
2. **Tài liệu Hướng dẫn chạy gốc:** Hướng dẫn lệnh cài đặt duy nhất tại root (`npm install`) và khởi động (`npm run dev`).
3. **Bộ định tuyến mở rộng (Route Map):** Các file router trong Staff Dashboard sẽ được tổ chức lại rõ ràng.
4. **Trang mẫu (Boilerplate Page):** Một component rỗng nhưng đã bọc sẵn Layout, AuthGuard và chuẩn CSS để F1 clone ra làm trang KDS (Kitchen Display System) hoặc POS (Point of Sale).

---

## 4. Nhiệm vụ của F1 tiếp theo (Để đồng bộ hóa)

Để bắt nhịp và phát triển tiếp, F1 cần thực hiện các bước sau:

1. **Pull & Verify:** Kéo code mới nhất, chạy thử `npm run dev`. Xác nhận cả PWA và Dashboard đều lên.
2. **Tuân thủ Design System:** Bất kỳ trang nào F1 tạo mới (KDS, POS) bắt buộc phải sử dụng các biến CSS `var(--color-brand-*)`. Không được dùng màu xám bẩn hoặc mã Hex bừa bãi. Tuân thủ tài liệu `THEMED_CONSOLIDATED.md`.
3. **Phát triển Màn hình KDS (Kitchen Display System):**
   - Đặt tại `apps/staff-dashboard/src/pages/KDS.tsx`.
   - Dùng `realtimeClient` để lắng nghe order mới.
   - Thiết kế giao diện thẻ order dạng Kan-ban (Chờ chế biến -> Đang làm -> Hoàn thành).
4. **Phát triển Backend Group-Order:**
   - Hiện thực hóa logic gom đơn (Merge Order) trên Server khi có nhiều thiết bị cùng chung Session ID.
5. **Giao tiếp qua `@fnb/utils`:** Nếu F1 cần thêm hàm core nào dùng chung, hãy viết thêm vào `packages/utils` theo chuẩn TDD giống như F2 đã làm.
