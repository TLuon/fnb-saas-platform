# Hướng Dẫn Sửa Lỗi Thanh Toán Bằng Tiền Mặt (CASH)

Tài liệu này ghi lại chi tiết nguyên nhân và cách khắc phục triệt để lỗi "lỗi dữ liệu tải lên" khi nhân viên thao tác thanh toán bằng Tiền mặt (CASH) trên trang POS của hệ thống F&B.

## 1. Nguyên nhân gây lỗi
- **Frontend (FE):** Ở ứng dụng Staff Dashboard (trong `POS.tsx`), khi nhân viên nhấn chọn phương thức thanh toán tiền mặt, FE đã gửi payload `{ "payment_method": "CASH" }` thông qua API `/orders/:id/pay`.
- **Backend (BE) & Database:**
  - DTO `PayOrderDto` của Backend đã hỗ trợ validate giá trị `'CASH'`. Tuy nhiên, Database (PostgreSQL - Supabase) lại có một lớp ràng buộc (Check constraint) ở bảng `orders` từ lúc khởi tạo dự án:
    `payment_method VARCHAR(30) CHECK (payment_method IN ('VIETQR','WALLET','COFFEE_PASS'))`.
  - Do `CASH` không nằm trong danh sách được phép này, cơ sở dữ liệu đã từ chối lệnh UPDATE và trả về lỗi, khiến quá trình thanh toán thất bại (Lỗi HTTP 500 Internal Server Error - lỗi dữ liệu cập nhật).

## 2. Cách xử lý trên Backend (Database)
Cần phải cập nhật lại schema của bảng `orders` trên cơ sở dữ liệu Supabase để cho phép giá trị `'CASH'` được lưu vào cột `payment_method`.

**Thao tác thực hiện:**
Mở SQL Editor trên trình quản lý của Supabase và chạy đoạn script sau (đã được lưu tại `backend/api/database/migrations/012_allow_cash_payment.sql`):

```sql
-- Bước 1: Gỡ bỏ lớp khóa (constraint) cũ của cột payment_method
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;

-- Bước 2: Thêm lại constraint mới, bao gồm thêm giá trị 'CASH'
ALTER TABLE orders ADD CONSTRAINT orders_payment_method_check 
  CHECK (payment_method IN ('VIETQR', 'WALLET', 'COFFEE_PASS', 'CASH'));
```

## 3. Cách xử lý & Luồng trên Frontend (Tham khảo bổ sung)
Hiện tại FE đã tích hợp nút thanh toán `CASH` chuẩn xác, tuy nhiên có một vài lưu ý về luồng chạy đã được tối ưu cho Đơn Mang đi (Takeaway):
- Đối với Đơn Mang đi, nút "Lưu Đơn & Gửi Bếp" đã được ẩn để tối giản giao diện.
- Khi nhân viên click thẳng vào nút "Thanh toán", FE sẽ thực hiện đồng thời 2 thao tác:
  1. Gửi gọi lệnh `/submit-kitchen` tự động xuống bếp để đầu bếp có thể chuẩn bị món ngay lập tức.
  2. Bật Popup cho phép chọn "Thanh toán Tiền mặt (Cash)" hoặc mã QR.
- Trạng thái đơn mang đi từ `PENDING` sẽ tự động chuyển thành `IN_PROGRESS` (đang thực hiện) ngay sau khi gọi API thanh toán thành công.

Sau khi chạy xong đoạn lệnh SQL phía trên, lỗi "dữ liệu tải lên" sẽ biến mất hoàn toàn và luồng thanh toán POS hoạt động bình thường.

## 4. Cập nhật Báo cáo Doanh thu trên Frontend (Owner & Staff Dashboards)
Sau khi khắc phục thành công để hệ thống chấp nhận và lưu phương thức thanh toán bằng Tiền mặt (`CASH`), bước tiếp theo bắt buộc phải làm là **cập nhật lại các biểu đồ và thống kê doanh thu trên Frontend** của cả Chủ cửa hàng (Owner) lẫn Nhân viên (Staff).

Do hệ thống hiện tại có thể chỉ đang lọc và cộng dồn doanh thu dựa trên các hình thức cũ (`VIETQR`, `WALLET`), việc thêm thanh toán `CASH` yêu cầu:
- **Owner Dashboard (Dashboard tổng quan):** Đảm bảo logic render biểu đồ doanh thu, thống kê tổng tiền phải tính gộp cả các đơn hàng có `payment_method === 'CASH'`.
- **Staff Dashboard (Báo cáo ca làm việc):** Ở phần kết ca (Shift) hoặc lịch sử giao dịch, số tiền mặt thu vào (Cash) phải được thống kê riêng và tổng hợp chính xác để nhân viên đối soát với tiền trong két. Điều này rất quan trọng do thực tế cửa hàng hiện đang thu tiền bằng 2 nguồn chính (Tiền mặt và Chuyển khoản).
