# Danh sách công việc (Task List) - Kết nối Frontend & Backend API

Dưới đây là các đầu việc cần thực hiện theo thứ tự để tích hợp hai nhánh code và thay thế mock data. Đánh dấu `[x]` khi hoàn thành một task.

### Giai đoạn 1: Chuẩn bị Môi trường và Gộp Code
- [ ] 1. Tạo một nhánh mới (ví dụ: `integration`) từ `bedev`.
- [ ] 2. Gộp (Merge) code từ nhánh `fedev` vào nhánh `integration` này để có cả thư mục frontend và backend thật.
- [ ] 3. Chạy lệnh cài đặt thư viện (`npm install`) cho cả frontend và backend trên nhánh mới.
- [ ] 4. Tạo file `.env` ở thư mục frontend (`apps/staff-dashboard`) và thiết lập biến môi trường `VITE_API_URL` trỏ tới Backend (vd: `http://localhost:3000`).

### Giai đoạn 2: Tích hợp Module KDS (Bếp)
- [ ] 5. Mở file `apps/staff-dashboard/src/pages/KDS.tsx`.
- [ ] 6. Chỉnh sửa kết nối Socket.io để trỏ về đúng WebSocketGateway của backend.
- [ ] 7. Cập nhật hàm `changeStatus` để gọi API `PATCH /order/:id/items/:itemId/kitchen-status` thay vì mock URL.
- [ ] 8. Kiểm tra thực tế KDS hoạt động với WebSocket.

### Giai đoạn 3: Tích hợp Module Hỗ trợ (Maker - Checker)
- [ ] 9. Mở file `apps/staff-dashboard/src/store/supportStore.ts`.
- [ ] 10. Viết hàm lấy dữ liệu thực tế từ API `GET /support/unmatched` thay thế mảng `transactions` tĩnh.
- [ ] 11. Cập nhật hàm `propose` để gọi `POST /support/unmatched/:id/propose`.
- [ ] 12. Cập nhật hàm `approve` để gọi `POST /support/unmatched/:id/approve`.

### Giai đoạn 4: Tích hợp Module Menu và Nhân sự
- [ ] 13. Mở `menuStore.ts`, cập nhật hàm fetch danh sách để gọi API `GET /menu/categories` và `GET /menu/products`.
- [ ] 14. Mở `staffStore.ts`, cập nhật hàm fetch danh sách để gọi API `GET /staff`.

### Giai đoạn 5: Kiểm tra toàn diện
- [ ] 15. Chạy lệnh `npm run dev` ở cả `backend/api` và `apps/staff-dashboard`.
- [ ] 16. Test nghiệm thu toàn bộ luồng hiển thị món ăn, cập nhật trạng thái bếp và duyệt giao dịch thanh toán trên giao diện.
