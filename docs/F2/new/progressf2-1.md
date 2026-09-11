# Tài liệu Bàn giao Frontend F2 (Handover Document)

Kính gửi Đội F1, 
Phân hệ F2 (Customer PWA & Staff Dashboard) đã hoàn tất. Dưới đây là những nội dung trọng điểm cần lưu ý khi tích hợp:

## 1. Các Modules Dùng Chung (Shared Resources)
Để đảm bảo tính đồng nhất trên toàn bộ hệ thống F&B SaaS, hai bên cần dùng chung các resource sau (đã cấu hình trong thư mục `packages/utils` và `packages/ui-shared`):
- **API Client (`apiClient.ts`)**: Tự động đính kèm `Bearer token`, xử lý tự động refresh token và intercept lỗi 401/403.
- **Trạng thái Bàn (`getTableColor`)**: Đã chuẩn hóa mã màu Hex (Xanh cho `AVAILABLE`, Đỏ cho `OCCUPIED`, Cam cho `RESERVED`). F1 khi làm POS bắt buộc dùng hàm này để render UI.
- **Hệ thống Floor Map (`FloorMapCanvas`)**: F2 đã tái sử dụng bản đồ kéo thả từ F1 ở chế độ read-only. F1 tiếp tục hoàn thiện phần Drag & Drop Admin.

## 2. Hệ thống API Endpoints F2 đang tiêu thụ
F2 hiện đang kết nối qua các Endpoint (cần B2 / F1 lưu ý khi đấu nối thật):
- `GET /api/v1/public/catalog`: Lấy thực đơn cho khách vãng lai.
- `POST /api/v1/auth/login`: Xác thực cho cả Customer lẫn Admin.
- `POST /api/v1/reservations/lock`: Giữ bàn 10 phút.
- `POST /api/v1/group-order/join`: Phiên đặt món chung.
- `GET /api/v1/support/unmatched`: Hàng đợi Maker-Checker.

## 3. Quản lý State (Zustand)
F2 hoàn toàn sử dụng `Zustand` thay vì Redux để giữ bundle size nhỏ gọn nhất cho PWA.
- **Auth**: `authStore.ts` quản lý session hiện tại.
- **Cart**: `cartStore.ts` quản lý giỏ hàng offline-first.

## 4. Các luồng đã test & Fix (Ngày 11/09/2026)
- Đã test 100% không còn lỗi TypeScript (Zero-error codebase).
- Đã sửa lỗi crash `Sidebar` khi `currentUser` là `null` lúc khởi động App.
- Đã giả lập mock login trong `authStore` để chạy UI testing mà không cần đợi API hoàn thiện.
- Các quy tắc chặn quyền đã được xác minh: Guest không đặt bàn được, Staff không vào được màn hình Owner.

Mọi thứ đã sẵn sàng để merge vào luồng CI/CD chung!
