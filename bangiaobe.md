# Bàn giao Backend (Luồng Đặt Bàn & Sơ đồ bàn)

## 1. Thiếu bảng `reservations` trong Database
**Vấn đề:** 
Hiện tại khi khách thanh toán cọc thành công, Backend chỉ update `status = 'RESERVED'` cho bàn đó trong bảng `tables` và xóa key Redis chứa thông tin giữ chỗ. Hệ thống hoàn toàn không lưu trữ việc **Ai là người đặt?**, **Đặt lúc mấy giờ?**, **Mã đặt bàn là gì?**.

**Yêu cầu BE:**
- Tạo thêm bảng `reservations` trong CSDL để lưu trữ thông tin:
  - `id` (UUID)
  - `tenant_id` (UUID)
  - `table_id` (UUID)
  - `customer_id` / `user_id` (UUID) - Để lấy tên và SĐT khách.
  - `reservation_code` (VARCHAR) - Mã đặt bàn (VD: RES_XXXXXX).
  - `reservation_time` (TIMESTAMPTZ) - Thời gian khách bắt đầu giữ bàn.
  - `status` (VARCHAR) - (Ví dụ: PENDING, PAID, CHECKED_IN, CANCELLED).
- Khi Webhook nhận thanh toán thành công (`mock-payment`), thay vì ném thông tin khách đi, hãy `INSERT` dữ liệu vào bảng `reservations` này.

## 2. Thiếu API Check-in cho Staff
**Vấn đề:**
Nhân viên (Staff) cần bấm vào bàn màu nâu (`RESERVED`) trên giao diện để xem thông tin khách và tiến hành Check-in (chuyển sang `OCCUPIED` và tạo giỏ hàng). Nhưng API lấy danh sách bàn hiện tại không trả về thông tin khách đặt, và cũng không có API nào để thực hiện Check-in.

**Yêu cầu BE:**
- Cập nhật API GET sơ đồ bàn (hoặc tạo API chi tiết bàn): Nếu `tables.status == 'RESERVED'`, cần JOIN với bảng `reservations` và `users`/`customers` để trả về thêm `customer_name`, `customer_phone`, `reservation_time`.
- Thêm API `POST /reservations/:code/check-in` (hoặc check-in theo `table_id`) dành cho STAFF:
  - Xác thực thông tin khách (quét mã QR code hoặc tìm bằng SĐT).
  - Đổi trạng thái bàn thành `OCCUPIED`.
  - Đổi trạng thái `reservations` thành `CHECKED_IN`.
  - Tự động khởi tạo một `order` (giỏ hàng) mới gán vào `current_order_id` của bàn đó.
