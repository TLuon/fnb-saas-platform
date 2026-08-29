# Danh sách Nhiệm vụ Frontend - Vai trò F2 (Customer & Admin FE)

Dưới đây là chi tiết các công việc bạn cần hoàn thành dựa theo tài liệu thiết kế. Khi hoàn thành một đầu việc, bạn có thể đánh dấu `[x]` thay cho `[ ]` để theo dõi tiến độ.

## 1. Thiết lập nền tảng chung (Base & Core)
- [ ] 1.1. Cấu hình `api-client.ts` cho Customer PWA (Next.js) và Staff Dashboard (Vite React), đảm bảo tự động đính kèm JWT và bắt lỗi theo chuẩn `ERROR_CODES.md`.
- [ ] 1.2. Cấu hình `realtime-client.ts` kết nối Supabase Realtime (kênh `tables`) và Socket.IO (kênh `group_order` và `support`).
- [ ] 1.3. Xây dựng bộ Guard (Routing) để chặn quyền truy cập đúng theo `role_app` (Customer/Owner/Support).

## 2. Customer PWA - Xác thực & Đặt bàn
- [ ] 2.1. Thiết kế và code luồng Đăng nhập / Đăng ký qua số điện thoại cho khách hàng.
- [ ] 2.2. Xây dựng màn hình Xem sơ đồ bàn trực quan (Tái sử dụng Component Canvas từ F1 nếu có, hoặc tự hiển thị trạng thái màu của bàn).
- [ ] 2.3. Tích hợp chức năng Khóa bàn tạm thời (`POST /reservations/lock`) và đếm ngược thời gian giữ chỗ (10 phút).
- [ ] 2.4. Hiển thị mã VietQR (mock) để khách hàng quét cọc giữ bàn.

## 3. Customer PWA - Thực đơn & Group-Order (Cốt lõi)
- [ ] 3.1. Xây dựng màn hình xem Thực đơn (Menu) chia theo Category.
- [ ] 3.2. Code tính năng Giỏ hàng cá nhân (Cart).
- [ ] 3.3. Xây dựng luồng Group-Order: Quét mã QR tại bàn để tham gia chung Session.
- [ ] 3.4. Tích hợp Realtime Socket.IO: Đồng bộ giỏ hàng chung giữa những người cùng bàn (`group_order_cart_updated`).
- [ ] 3.5. Xử lý UI hiển thị "món này do ai gọi" trong giỏ hàng chung.
- [ ] 3.6. Xử lý trường hợp mất mạng / reconnect để khôi phục đúng trạng thái giỏ hàng.

## 4. Customer PWA - Thanh toán & CSAT
- [ ] 4.1. Xây dựng màn hình Thanh toán (Checkout) với 3 phương thức: VietQR, Ví trả trước (Wallet), Coffee Pass.
- [ ] 4.2. Thiết kế màn hình Khảo sát đánh giá (CSAT) hiển thị ngay khi thanh toán đơn hàng thành công (`COMPLETED`).

## 5. Customer PWA - Ví & Coffee Pass
- [ ] 5.1. Màn hình Quản lý Ví (Wallet): Xem số dư chính (`main_balance`), số dư khuyến mãi (`promo_balance`) và lịch sử biến động.
- [ ] 5.2. Chức năng Nạp ví (Top-up): Giả lập luồng nạp tiền vào ví.
- [ ] 5.3. Màn hình Voucher: Hiển thị danh sách các mã giảm giá, voucher được CSKH đền bù.
- [ ] 5.4. Tính năng Coffee Pass: Xem danh sách các gói Pass và mua gói.
- [ ] 5.5. Hiển thị vé Coffee Pass: Sinh và hiển thị mã TOTP (tự động đếm ngược & làm mới mỗi 30 giây) để quét tại quầy.

## 6. Staff Dashboard - Dành cho OWNER (Quản trị hệ thống)
- [ ] 6.1. Màn hình Quản lý Thực đơn (Menu Management): CRUD Categories và CRUD Products (giá, loại bếp, trạng thái bán).
- [ ] 6.2. Màn hình Quản lý Nhân sự (Staff Management): Tạo, chỉnh sửa, vô hiệu hóa tài khoản cho STAFF và SUPPORT.
- [ ] 6.3. Báo cáo (Analytics Dashboard): Hiển thị biểu đồ doanh thu, tỷ lệ lấp đầy bàn, top món bán chạy (gọi `/reports/dashboard`).
- [ ] 6.4. Màn hình Hồ sơ khách hàng (CDP): Danh sách khách hàng, phân khúc RFM, và góc nhìn 360 độ lịch sử tiêu dùng của 1 khách.

## 7. Staff Dashboard - Dành cho SUPPORT (Chăm sóc khách hàng)
- [ ] 7.1. Màn hình Hàng đợi Tra soát (Support Board): Liệt kê các giao dịch chuyển khoản VietQR bị lỗi (`unmatched_transactions`).
- [ ] 7.2. Tích hợp chức năng gợi ý khách hàng: Gọi API so khớp mờ (fuzzy-match) để tìm đúng khách hàng gửi nhầm tiền.
- [ ] 7.3. Luồng Maker-Checker (2 cấp): Xây dựng tính năng cho phép tạo đề xuất (Maker) và duyệt đề xuất (Checker) để gộp giao dịch. Ngăn chặn tự duyệt (`ERR_6002_SELF_APPROVAL`).
- [ ] 7.4. Màn hình Quản lý Khiếu nại (Ticket): Nhận thông báo realtime các đánh giá CSAT ≤ 2 sao (`support_ticket_urgent_created`).
- [ ] 7.5. Chức năng Đền bù: Xử lý ticket và thao tác gửi tặng Voucher đền bù (CSAT_APOLOGY) cho khách.

## 8. Chuẩn bị Bàn giao cho F1
*Mục tiêu: Gom gói mọi thứ để F1 bắt đầu code các form CRUD không vướng bận.*

1. Đẩy mã nguồn lên Git, gửi hướng dẫn lệnh cài đặt (`npm install` & `npm run dev`).
2. Định nghĩa rõ cấu trúc route trong file constants để F1 chỉ việc import component Page của họ vào route map.
3. Bàn giao 1 file mẫu (ví dụ màn hình Profile rỗng) có sẵn Layout chung để F1 clone và phát triển tiếp.
