# Log: Thay đổi sau khi kết nối (FE + BE)

File này ghi lại toàn bộ các tinh chỉnh và logic được xử lý sau khi nhánh FE đã hợp nhất toàn bộ thay đổi kết nối API từ nhánh BE.

## 1. Sửa lỗi Crash do import thiếu từ nhánh BE
- **File**: `apps/customer-pwa/src/app/reservation/[code]/page.tsx`
- **Thay đổi**: Thêm dòng `import { useParams } from 'next/navigation';`. Đội BE gọi hook này để lấy mã đặt bàn trên thanh địa chỉ nhưng quên import, khiến màn hình trắng bóc (Crash). Đã fix hoàn toàn.

## 2. Nâng cấp giao diện trang chủ theo chuẩn UI/UX Pro Max
- **File**: `apps/customer-pwa/src/app/page.tsx`
- **Thay đổi**: 
  - Đẩy thương hiệu **The F&B SaaS Coffee** lên thành tiêu đề H1 lớn nhất trang (kích thước `8xl`), sử dụng dải màu Gradient đặc trưng để gây ấn tượng mạnh.
  - Thu gọn đoạn text cũ thành một Slogan duy nhất ("✨ Hương vị tuyệt hảo, trải nghiệm khó quên.") và loại bỏ đoạn văn lê thê bên dưới giúp tạo khoảng không (Negative Space) chuẩn mực.

## 3. Ghép nối 2 luồng: Đặt bàn (Reservation) & Đặt món (Menu Order)
- **Vấn đề cũ**: Luồng Đặt bàn kết thúc sau khi khách hàng nạp tiền cọc, khách hàng sang Menu chọn món sẽ thành 1 hóa đơn hoàn toàn khác (Takeaway) và không liên kết với bàn đã đặt.
- **Giải pháp**: 
  - **File `ReservationResult.tsx`**: Sau khi nạp cọc thành công, nút "Đến trang Menu" giờ đây mang theo mã đặt bàn trên URL (ví dụ: `/menu?reservationCode=123`).
  - **File `cartStore.ts`**: Bổ sung thêm state `reservationCode` vào Zustand Store (Local Storage) để ghi nhớ mã đặt bàn của khách xuyên suốt quá trình thao tác.
  - **File `menu/page.tsx`**: Trang Menu tự động "lắng nghe" URL, nếu phát hiện có mã đặt bàn, nó sẽ lưu ngầm vào `cartStore`.
  - **File `CheckoutButton.tsx`**: Khi khách hàng nhấn "Thanh toán", ứng dụng sẽ kiểm tra xem khách có mã Đặt bàn hay không. Nếu có, nó sẽ gửi mã này cho BE đồng thời tự động chuyển loại đơn hàng thành **DINE_IN** (Ăn tại quán). Nếu không, vẫn giữ nguyên mặc định là **TAKEAWAY** (Mang đi).

> **Kết quả:** Trải nghiệm giờ đây hoàn toàn liền mạch. Khách hàng khóa bàn xong -> chọn món -> thanh toán -> Đơn hàng tự động bay vào KDS của bếp và lưu chính xác số bàn đã đặt!

## 4. Xử lý lỗi Crash "Trang Staff trắng bóc" (VITE_SUPABASE_URL)
- **File**: `packages/utils/src/realtime-client.ts`
- **Vấn đề**: Đội BE bổ sung chức năng kết nối realtime tới Supabase cho hệ thống KDS (bếp). Nhưng do file biến môi trường chưa có giá trị `VITE_SUPABASE_URL`, thư viện `@supabase/supabase-js` nhận vào chuỗi rỗng và tung lỗi Crash toàn bộ ứng dụng Staff (màn hình trắng).
- **Giải pháp**: Bổ sung cơ chế Fallback (chuỗi dự phòng `https://dummy.supabase.co`). Nếu không tìm thấy URL thật, hệ thống sẽ sử dụng chuỗi ảo để bypass lỗi, giúp ứng dụng khởi động thành công.

## 5. Cải thiện màu sắc và độ tương phản Sidebar (Staff Dashboard)
- **File**: `apps/staff-dashboard/src/components/Sidebar.tsx`
- **Vấn đề**: Menu bên trái bị mờ do lỗi CSS và thỉnh thoảng kẹt hiệu ứng GSAP làm mất hoàn toàn độ tương phản (chữ màu cực kỳ nhạt trên nền sáng).
- **Giải pháp**: Xóa bỏ GSAP animation dư thừa cho các nút điều hướng, cài đặt lại màu nền cho trạng thái Active (Đang chọn) thành Nâu đậm (`#543310`) và chữ Trắng. Trạng thái Inactive dùng chữ Xám đậm nổi bật.

## 6. Xử lý sự cố thiếu ảnh Món ăn (Customer PWA)
- **File**: `apps/customer-pwa/src/components/ProductCard.tsx`
- **Vấn đề**: Cơ sở dữ liệu và API Backend hoàn toàn KHÔNG CÓ trường `image_url` cho bảng Sản phẩm. Do đó FE luôn nhận về rỗng và chỉ hiển thị khối chữ `[Hình ảnh]` mờ nhạt.
- **Giải pháp**: Cấu hình sử dụng dịch vụ `placehold.co` để tự động render ảnh placeholder. Các ảnh này được tuỳ chỉnh màu sắc chuẩn Brand (Nền be `#E8DED5`, Chữ nâu đậm `#543310`) và tự động in Tên món ăn lên giữa khung hình để thay thế hoàn hảo cho ảnh gốc.

## 7. Nâng cấp Thanh điều hướng Header (Customer PWA)
- **File**: `apps/customer-pwa/src/components/PublicHeader.tsx`
- **Thay đổi**: Đổi chữ trên thanh điều hướng sang viết hoa (UPPERCASE), in đậm, và có gạch chân màu nâu khi đang truy cập. Bổ sung thêm các tab "Trang chủ" và "Khuyến mãi" giúp tổng thể đầy đủ và sang trọng hơn.

## 8. Chỉnh sửa luồng UX & Ảnh khoá món ăn
- Thay đổi ảnh mặc định sang **Ảnh Stock Cà phê nghệ thuật** từ Unsplash.
- **File**: `ProductCard.tsx`, `FeaturedMenuSection.tsx`, `ProductDetailModal.tsx`
- **UX Update**: Bấm nút `+` ngoài thẻ sẽ thêm thẳng vào giỏ hàng. Bấm vào Ảnh sẽ mở Modal chi tiết. Nút trong Modal được sửa từ `Thêm - [Giá]` thành đúng chữ `Thêm`.

## 9. Sửa lỗi hiển thị sai Tên Bàn tại trang Thanh toán
- **File**: `floors/page.tsx`, `cart/page.tsx`, `cartStore.ts`, `ReservationResult.tsx`, `menu/page.tsx`
- **Vấn đề**: Giao diện Giỏ hàng (Cart) bị code cứng chữ `"T1-01"`. Dù khách chọn bàn nào, lúc thanh toán cũng ra `T1-01`.
- **Giải pháp**: Xây dựng luồng đồng bộ "Tên bàn" xuyên suốt: Khách chọn bàn -> URL mang tên bàn sang Modal Cọc tiền -> URL mang tên bàn sang Menu -> Lưu tên bàn vào `cartStore` -> Trang Thanh toán đọc tên bàn thực tế ra để hiển thị thay vì code cứng. Tự động chuyển loại đơn thành `DINE_IN` hoặc `TAKEAWAY` dựa vào việc có mã bàn hay không.
