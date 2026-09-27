# Kế Hoạch Sửa Lỗi & Tối Ưu Trang Customer PWA (`apps/customer-pwa`)

## 📋 Danh Sách Hạng Mục Đã Hoàn Thành

- [x] **Mục 1: Trạng thái Đóng/Mở cửa Realtime theo giờ máy tính người dùng (`BranchInfoBar.tsx`)**
  - Khung giờ quy định: **08:00 - 22:00**.
  - Lấy thời gian thực từ máy tính client (`new Date()`).
  - Hiển thị nhãn **`Đang mở cửa`** (màu xanh `#15803D`) khi trong khung giờ 08:00 - 22:00.
  - Hiển thị nhãn **`Đang đóng cửa`** (màu đỏ `#B42318`) khi ngoài khung giờ trên.
  - Xử lý qua `useEffect` tránh lỗi lệch SSR Hydration.

- [x] **Mục 2: Xử lý nút "Đặt bàn ngay" ở phần Hero Trang Chủ (`app/page.tsx`)**
  - Loại bỏ chặn `requireAuth` gây đứng nút đối với khách chưa đăng nhập.
  - Cho phép điều hướng trực tiếp sang trang đặt bàn `/floors` đồng bộ với nút **Đặt bàn** trên `PublicHeader`.

- [x] **Mục 3: Khắc phục nút "Thêm +" tại danh mục Món Nổi Bật Trang Chủ (`FeaturedMenuSection.tsx`)**
  - Bỏ chuyển hướng `/menu` bắt buộc và bỏ chặn `requireAuth`.
  - Thêm món trực tiếp vào giỏ hàng chung `useCartStore`.
  - Nhúng thanh giỏ hàng nổi `CartSummaryBar` vào `app/page.tsx` để người dùng mua sắm trực tiếp từ Trang chủ.

- [x] **Mục 4: Khắc phục nút "Thêm +" tại trang Thực Đơn (`ProductCard.tsx` & `app/menu/page.tsx`)**
  - Bỏ chặn `requireAuth` trên sự kiện bấm nút `+` của thẻ món ăn.
  - Thêm món nhanh vào giỏ hàng và cập nhật số lượng lập tức.

- [x] **Mục 5: Sửa nút "Thêm" trong Modal Xem Chi Tiết Món (`ProductDetailModal.tsx`)**
  - Bỏ chặn `requireAuth` trên nút "Thêm" trong Popup chi tiết.
  - Thêm món theo đúng số lượng (1, 2, 3...) và ghi chú vào `useCartStore`, sau đó đóng popup và hiển thị thông báo.

- [x] **Mục 6: Luồng Giỏ Hàng & Chuyển Trang Thanh Toán/Đăng Nhập (`CheckoutButton.tsx`)**
  - Cho phép duyệt và thêm món vào giỏ hàng thoải mái trước khi xác thực.
  - Khi bấm **"Thanh toán"** ở Giỏ hàng:
    - Chưa đăng nhập: Chuyển hướng tới trang Đăng nhập `/login?returnUrl=/cart`.
    - Đã đăng nhập: Chuyển sang trang tạo đơn & thanh toán `/checkout`.
