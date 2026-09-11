# Chi tiết Triển khai Nhiệm vụ F2 (Customer & Admin FE)

Tài liệu này ghi lại chi tiết các bước triển khai kỹ thuật cho các nhiệm vụ của F2.

## 1. Thiết lập nền tảng chung (Base & Core)
- **1.1. Cấu hình HTTP Client**:
  - Dùng **`axios`** cho cả Next.js (Customer PWA) và Vite (Staff Dashboard).
  - Tạo interceptor tập trung để gắn JWT (`Authorization: Bearer`) và xử lý lỗi global (ví dụ: hiển thị toast notification dựa trên `ERROR_CODES.md`).
- **1.2. Cấu hình Realtime**:
  - Khởi tạo **React Context Providers** (`RealtimeProvider`).
  - Trong đó bọc cả instance của Supabase Realtime (cho kênh `tables:{branch_id}`) và Socket.IO (cho kênh `group_order` và `support`).
  - Tự động handle connect khi mount và cleanup (disconnect) khi unmount.
- **1.3. Phân quyền Guard (Routing)**:
  - **Customer PWA (Next.js):** Dùng **Middleware** chạy ở Edge để chặn quyền và redirect ngay trên server, tránh chớp giật UI (cần lưu JWT vào cookie để Middleware đọc được).
  - **Staff Dashboard (Vite):** Dùng React Router Loaders hoặc bọc HOC (Higher-Order Component) để chặn truy cập trái phép.

## 2. Share UI Components (Phối hợp F1 & F2)
- **Kiến trúc Monorepo**: Dùng npm workspaces, chia sẻ UI nếu cần (qua thư mục `packages/ui-shared` hoặc alias).
- **Sơ đồ bàn (FloorMapCanvas)**: Component này do F1 (hoặc một bên khác) cung cấp, F2 cần chuẩn bị layout và import vào. Lưu ý trên Next.js phải bọc bằng dynamic import với `ssr: false` để tránh lỗi liên quan đến thẻ `<canvas>` khi render trên server.

## 3. Customer PWA - Thực đơn & Group-Order
- **Quản lý State Giỏ hàng**:
  - Sử dụng **`Zustand`** để lưu trữ trạng thái giỏ hàng chung. Zustand nhẹ và dễ dùng, rất phù hợp với Next.js và Vite.
  - Khi Socket.IO nhận event `group_order_cart_updated`, chỉ cập nhật state trong Zustand store. Các component tự subscribe để re-render.
- **Xử lý Mất kết nối (Offline/Reconnect)**:
  - Lắng nghe event `connect` của Socket.IO, nếu reconnect thành công thì tự động gọi API fetch lại giỏ hàng (`GET /group-order/:tableId/cart`) để đồng bộ trạng thái mới nhất, tránh trường hợp client bị lỡ mất event khi mất mạng.

## 4. Customer PWA - Ví & Coffee Pass
- **Mã TOTP (Vé Coffee Pass)**:
  - Phải sinh mã **trực tiếp tại Client** (offline-first) thông qua thư viện (ví dụ: `otplib`).
  - Backend chỉ cung cấp Secret Key 1 lần. Frontend tự dùng thời gian hệ thống để render mã TOTP và tự động làm mới mã mỗi 30s. Điều này giúp khách hàng vẫn dùng được vé ngay cả khi ở khu vực sóng yếu, mất mạng.

## 5. Staff Dashboard - Dành cho SUPPORT
- **Luồng Maker-Checker (Duyệt 2 cấp)**:
  - UI hiển thị danh sách các đề xuất cần duyệt.
  - Nếu người duyệt (checker) có ID trùng với người tạo đề xuất (maker), bắt buộc vô hiệu hóa (disable) nút "Duyệt" và hiển thị tooltip thông báo lỗi `ERR_6002_SELF_APPROVAL`.
- **Hàng đợi CSAT & Thông báo Realtime**:
  - Client subscribe vào channel `support` của Socket.IO.
  - Lắng nghe event `support_ticket_urgent_created` (đánh giá <= 2 sao) để hiển thị Push Notification / Toast ngay lập tức cho CSKH xử lý đền bù.
