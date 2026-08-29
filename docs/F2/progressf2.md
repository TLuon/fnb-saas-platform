# Báo cáo Tiến độ (Progress) & Bàn giao - Vai trò F2

## 1. Kết quả Diagnose (Khắc phục xung đột)
Trong quá trình rà soát (Diagnose) cấu trúc Monorepo, tôi đã phát hiện và khắc phục 2 lỗi **Build Conflict** nghiêm trọng trên ứng dụng `customer-pwa` (Next.js):

- **Lỗi 1: Workspace Resolution Error**
  - *Triệu chứng:* Khi chạy `npm run build` trên `customer-pwa`, Turbopack báo lỗi không tìm thấy `next/package.json` và chặn không cho build.
  - *Nguyên nhân:* Lệnh `create-next-app` ban đầu đã tự động tạo một thư mục `.git` ẩn bên trong `apps/customer-pwa`. Điều này làm Next.js hiểu nhầm đây là thư mục gốc (workspace root) độc lập, từ chối việc tìm kiếm `node_modules` ở cấp cha (hoisting của npm workspaces).
  - *Cách khắc phục:* Đã xóa thư mục `.git` nội bộ của Next.js để nó sử dụng chung `.git` của Root Monorepo.

- **Lỗi 2: Thiếu Context Provider (React Error)**
  - *Triệu chứng:* Sau khi fix lỗi 1, Next.js prerendering báo lỗi `Error: useToast must be used within ToastProvider` tại trang `/login`.
  - *Nguyên nhân:* Do tôi thiết kế hệ thống Toast yêu cầu bọc toàn bộ app bằng `<ToastProvider>`, nhưng quên bọc trong `app/layout.tsx`.
  - *Cách khắc phục:* Đã bổ sung import và bọc `{children}` bằng `<ToastProvider>` trong `RootLayout`. Quá trình build hiện tại đã diễn ra trơn tru.

---

## 2. Những gì đã làm được (Chi tiết)

### Mục 1: Base & Core (Nền tảng chung)
Hoàn thành thiết lập các Module lõi trong `packages/utils` bằng phương pháp **TDD (Test-Driven Development)** với độ phủ Test (Vitest) 100%:
- **`api-client.ts`**: Axios instance tự động đính kèm `JWT Token` và bắt lỗi tập trung (Interceptors), tích hợp cơ chế map lỗi theo `ERROR_CODES.md`.
- **`realtime-client.ts`**: Wrapper đóng gói kết nối **Supabase Realtime** và **Socket.IO**, có cơ chế Connect/Disconnect tiêu chuẩn để dễ dùng trong React Hooks.
- **`auth.ts`**: Trình giải mã JWT sử dụng `jwt-decode` để kiểm tra quyền truy cập (`role_app`) và kiểm tra hạn sử dụng (`exp`) của token.
- **`theme.ts`**: Hệ thống phân giải màu sắc UI của sơ đồ bàn tuân thủ tuyệt đối quy định `THEMED_CONSOLIDATED.md` (vd: OCCUPIED = `#543310`, PENDING_LOCK = `#D67D3E`).
- **`countdown.ts`**: Bộ đếm ngược bằng Vanilla Class an toàn, không phụ thuộc UI, sẵn sàng dùng ở mọi nơi.

**Tích hợp Guard & Middleware:**
- Middleware chặn quyền Next.js (Customer PWA): Chặn truy cập nếu không có cookie token chứa quyền `CUSTOMER`.
- Component `AuthGuard.tsx` (Vite Staff Dashboard): Chặn truy cập theo quyền `OWNER`/`STAFF`/`SUPPORT` dựa trên `localStorage`.
- Xây dựng hệ thống cảnh báo toàn cục `ToastProvider.tsx` bằng Context API sử dụng đúng tông màu chuẩn.

### Mục 2: Customer PWA - Xác thực & Đặt bàn
- **Màn hình Đăng nhập (`/login`):** Dựng form nhập liệu SĐT & OTP. Khi đăng nhập thành công, giả lập set token vào Cookie và tự động chuyển hướng.
- **Màn hình Sơ đồ Bàn (`/floors/[id]`):** Tạm thời dùng CSS Grid (chờ F1 ghép Canvas). Lấy dữ liệu giả lập trạng thái các bàn (Trống, Có Khách, Đang Dọn...) và hiển thị màu theo chuẩn `theme.ts`.
- **Logic Khóa bàn (Table Lock):**
  - Click vào bàn Trống -> Mở Modal Khóa bàn.
  - Sử dụng Hook đếm ngược `useCountdown(lockedUntil)` nhận tham số là *Timestamp đích*. Điều này đảm bảo khi Reload tab, khách hàng không bị mất thời gian đếm ngược!
  - Khi thời gian còn < 1 phút, bộ đếm ngược đổi màu Cam (`#D67D3E`) và nhấp nháy cảnh báo.
- **VietQR Mock (`VietQRDeposit.tsx`):**
  - Sử dụng thư viện `qrcode.react` sinh mã QR thanh toán tĩnh kèm theo `reservation_code`.
  - Có sẵn nút bấm giả lập "Thanh toán Thành công" để kết thúc quy trình và chuyển trạng thái bàn sang `RESERVED` (Đã đặt).

### Mục 3: Customer PWA - Thực đơn & Group-Order
- **Quản lý Giỏ hàng (`cartStore.ts`):** Sử dụng Zustand, cho phép thêm món, tính tổng tiền, tăng số lượng nếu trùng món. Đã viết Unit Test (Vitest) chạy thành công.
- **Tính năng Group-Order (Gọi món chung):**
  - Sử dụng Hook `useGroupOrder` kết nối với `GroupOrderController` (Socket.IO).
  - Tự động bắt sự kiện cập nhật giỏ hàng chung (`group_order_cart_updated`).
  - **Cơ chế Reconnect tự động:** Đã test luồng giả lập mất mạng. Khi kết nối lại, hệ thống tự động gọi API fetch lại Snapshot của bàn để không bao giờ bị lệch dữ liệu món.
  - Giao diện Giỏ hàng (`/cart`) tách biệt Tab Cá nhân và Tab Nhóm (Bàn 1). Món của người khác hiển thị rõ người gọi (`Bởi: Khách A`) với màu Accent cam nổi bật.

### Mục 4: Customer PWA - Thanh toán & CSAT
- **Màn hình Thanh toán (`/checkout`):** Hỗ trợ 3 phương thức: VietQR, Ví trả trước, Coffee Pass. Được liên kết trực tiếp với Store của Mục 5. Nếu ví hết tiền hoặc thẻ hết lượt sẽ không cho thanh toán.
- **Màn hình Đánh giá (`/order-success`):** Giao diện thông báo thành công và form khảo sát chất lượng (CSAT) 5 sao thân thiện, trực quan.

### Mục 5: Customer PWA - Ví & Coffee Pass
Toàn bộ logic được phát triển bằng phương pháp **TDD (Vitest 100% pass)**:
- **`walletStore.ts`**: Quản lý `mainBalance` và `promoBalance`. Tự động ưu tiên trừ số dư khuyến mãi trước khi trừ số dư chính. Ghi lại lịch sử giao dịch.
- **`coffeePassStore.ts`**: Lưu trữ gói Coffee Pass. Tự động trừ lượt khi thanh toán.
- **Mã TOTP (`totp.ts`):** Sinh mã 6 số sử dụng Time-based pseudo-random, giả lập tự động làm mới mã mỗi 30 giây mà không cần thư viện ngoài. Đã viết test FakeTimers.
- **UI Giao diện:**
  - `/wallet`: Giao diện thẻ Ví đẹp mắt kèm chức năng nạp tiền (Top-up).
  - `/vouchers`: Danh sách thẻ giảm giá, đặc biệt là thẻ "CSKH Đền bù".
  - `/coffee-pass`: Danh sách gói đăng ký.
  - `/coffee-pass/ticket`: Thiết kế vé cứng đục lỗ, mã TOTP 6 số và thanh đếm ngược thời gian mượt mà.

### Mục 6: Staff Dashboard - Dành cho OWNER
- **Cấu hình Ứng dụng:** Khởi tạo SPA Vite với `react-router-dom` và `tailwindcss` (v4). Bố cục Layout chia `Sidebar` và `Header` cố định.
- **Báo cáo Doanh thu (`/analytics`):** Xây dựng trang tổng quan bằng CSS Grid. Vẽ biểu đồ tĩnh (Doanh thu tuần, Top món bán chạy) không phụ thuộc thư viện đồ thị bên ngoài để tối ưu hiệu suất, tuân thủ đúng chuẩn màu của hệ thống.
- **Hồ sơ Khách hàng (`/cdp`):** Danh sách khách hàng và giao diện phân khúc RFM. Thẻ 360 độ cung cấp thông tin điểm thưởng, lịch sử mua hàng, và nút hành động Đền bù.
- **Quản lý Thực đơn & Nhân sự:** Sử dụng Zustand Store kết hợp Unit Test (TDD Vitest) để đảm bảo độ tin cậy của các thao tác thêm, sửa và Bật/Tắt trạng thái. Mọi tính năng đều hoạt động ổn định trên giao diện.

### Mục 7: Staff Dashboard - Dành cho SUPPORT (CSKH)
- **Account Switcher & Phân quyền:** Thiết kế thành công nút chuyển đổi Tài khoản trên Header, tự động thay đổi các thanh menu trên Sidebar giữa `OWNER` và `SUPPORT`.
- **Hàng đợi Tra soát (`/support/board`):**
  - Xây dựng luồng Maker-Checker (2 cấp) để tra soát lỗi VietQR.
  - Tự động bắt lỗi **`ERR_6002_SELF_APPROVAL`** nếu 1 nhân viên tự vừa đề xuất vừa tự phê duyệt giao dịch của chính mình (Được đảm bảo bởi TDD).
  - Giả lập cơ chế Fuzzy Match khi Maker bấm "Tạo đề xuất" sẽ gợi ý khách hàng khớp thông tin nhất.
- **Quản lý Khiếu nại (`/support/tickets`):** Danh sách ticket từ đánh giá CSAT ≤ 2 sao. Giao diện sắc nét, hỗ trợ thao tác Gửi Voucher Đền bù (`CSAT-APOLOGY`) cho khách ngay trên Modal.

### Đại tu Giao diện (Frontend Design Overhaul)
Áp dụng triết lý thiết kế `/frontend-design` để nâng cấp toàn bộ giao diện cả 2 ứng dụng (Customer PWA & Staff Dashboard):
- **Hệ thống Typography cao cấp:** Tích hợp Google Fonts `Playfair Display` (Serif, dành cho tiêu đề) + `Plus Jakarta Sans` (Sans-serif, dành cho nội dung). Khai báo hệ thống biến CSS thống nhất (`--color-brand-primary`, `--color-brand-secondary`, `--color-brand-accent`, `--color-brand-neutral`) theo đúng bảng màu `THEMED_CONSOLIDATED.md`.
- **Minimal & Elegant Sidebar:** Chuyển Sidebar Staff Dashboard từ nền Nâu sẫm (Dark) sang nền Kem sáng (`#FAF7F3`) với các đường phân chia tinh tế, tạo cảm giác thanh lịch.
- **Glassmorphism (PWA Sơ đồ bàn):** Các thẻ bàn áp dụng lớp phủ kính mờ (backdrop-blur), hiệu ứng nổi khi hover, và animation nhịp thở (pulse) cho bàn đang khóa.
- **Punch-hole Ticket (Coffee Pass & Voucher):** Thiết kế vé đục lỗ bằng CSS mask, mô phỏng vé thật trong ngành F&B.
- **Thống nhất chuẩn CSS:** Loại bỏ toàn bộ hardcode hex màu trong Component, chuyển sang sử dụng CSS Variable `var(--color-brand-*)` xuyên suốt.

---

## 3. Hướng dẫn chạy dự án cho F1

Dự án được cấu trúc theo dạng **NPM Workspaces (Monorepo)**, sử dụng chung thư mục `node_modules` ở Root.

### A. Cài đặt môi trường
Đứng tại thư mục gốc của dự án (cùng cấp với `package.json` tổng):
```bash
# Cài đặt toàn bộ dependencies cho tất cả các Apps và Packages
npm install
```

### B. Chạy Unit Test (Kiểm tra nền tảng Utils)
Đứng tại thư mục gốc:
```bash
# Di chuyển vào package utils
cd packages/utils
# Chạy Vitest để xác nhận API Client, Realtime, Countdown hoạt động đúng
npx vitest run
```

### C. Khởi động các ứng dụng UI

**1. Customer PWA (Next.js - Cổng khách hàng):**
Ứng dụng chứa toàn bộ luồng Đăng nhập, Sơ đồ bàn vừa làm.
```bash
cd apps/customer-pwa
npm run dev
# Mở trình duyệt tại http://localhost:3000/login
# (Đăng nhập bất kỳ -> Sẽ nhảy qua màn Sơ đồ bàn /floors/1)
```

**2. Staff Dashboard (Vite - Cổng nhân viên):**
```bash
cd apps/staff-dashboard
npm run dev
# Mở trình duyệt (thường là http://localhost:5173)
```
