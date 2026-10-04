# 📋 Báo Cáo Đồng Bộ & Cập Nhật Hệ Thống — 27/09/2026

## 1. Dời Vị Trí Nút Zoom Sơ Đồ Bàn (Zoom Control Layout Fix)
- **Khắc phục triệt để:** Đã chuyển bộ nút Zoom `[+ - Reset (100%)]` lên **góc trên bên trái canvas (`top-3 left-3 z-[100]`)** trong [FloorMapCanvas.tsx](file:///c:/Users/ADMIN/OneDrive/Desktop/fnb-saas-platform/packages/ui-shared/src/FloorMapCanvas.tsx).
- **Thiết kế mới:** Cụm nút Zoom được tạo nền trắng viền xám nổi bật với `z-[100]`, hoàn toàn tách biệt với thanh công cụ thêm vật phẩm trang trí (Cửa, Cầu thang, Bồn hoa, View, Ban công, WC, Quầy Order, Bể cá) ở góc dưới bên phải. Không còn tình trạng che đè hay cản trở thao tác chọn vật phẩm.

---

## 2. Thông Báo Đăng Nhập Cho Tài Khoản Bị Vô Hiệu Hóa
- **Xử lý đăng nhập:** Đã cập nhật xử lý lỗi trong [Login.tsx](file:///c:/Users/ADMIN/OneDrive/Desktop/fnb-saas-platform/apps/staff-dashboard/src/pages/Login.tsx): khi bất kỳ tài khoản nào bị vô hiệu hóa cố gắng đăng nhập, hệ thống sẽ bắt thông điệp từ backend (`err.response.data.message` hoặc `ERR_1001_UNAUTHORIZED`) và hiển thị khung cảnh báo màu đỏ nổi bật: **"Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ Quản lý!"**.

---

## 3. Rà soát Biên Dịch
- Backend NestJS `npm run build`: ✅ PASS (100% success)
- Frontend Staff Dashboard `npx tsc --noEmit`: ✅ PASS (0 errors)
