# F2 Code Review Report

Tài liệu này tổng hợp các lỗi và điểm không khớp giữa code thực tế và tài liệu thiết kế/báo cáo của thành viên F2 tại thư mục `apps` và `packages`. (Chỉ liệt kê, không sửa đổi mã nguồn).

## 1. Lỗi chưa tái sử dụng UI Component chung (Sơ đồ bàn)
- **Tập tin:** `apps/customer-pwa/src/app/floors/[id]/page.tsx`
- **Vấn đề:** Trong tài liệu `taskdetailf2.md` mục 2, F2 được yêu cầu tái sử dụng `FloorMapCanvas` do F1 cấp và dùng dynamic import (`ssr: false`) trên Next.js. Tuy nhiên, trong code thực tế của màn hình Sơ đồ bàn, F2 không import component này mà tự hardcode dựng một CSS Grid thuần chứa các ô vuông (`div`) mô phỏng bàn. Tính năng "Sơ đồ bàn trực quan" không được ghép nối đúng chuẩn.

## 2. Hardcode JWT Token khi kết nối Realtime
- **Tập tin:** `apps/customer-pwa/src/hooks/useGroupOrder.ts`
- **Vấn đề:** Tại dòng 15-16, F2 viết:
  ```typescript
  const token = 'mock_jwt_token';
  const client = new RealtimeClient('http://localhost:3000', token);
  ```
- **Hậu quả:** Socket.IO luôn gửi chuỗi `'mock_jwt_token'` thay vì lấy JWT thực tế của người dùng từ hệ thống/Cookie. Việc này sẽ khiến Backend lập tức ngắt kết nối (reject) vì token không hợp lệ (lỗi Unauthorized). F2 chưa tích hợp thành công Auth vào Realtime.

## 3. Giao diện Maker-Checker không chặn tự duyệt (Self-Approval)
- **Tập tin:** `apps/staff-dashboard/src/pages/SupportBoard.tsx`
- **Vấn đề:** Trong báo cáo, F2 khẳng định: *"Nếu người duyệt có ID trùng với người tạo đề xuất, bắt buộc vô hiệu hóa (disable) nút Duyệt..."*. Nhưng ở đoạn code render nút Duyệt (dòng 86-94), không hề có thuộc tính `disabled={tx.makerId === currentUser.id}`.
- **Hậu quả:** Nút Duyệt luôn sáng và có thể bấm được ở bất kỳ trường hợp nào. Nó chỉ văng lỗi `ERR_6002_SELF_APPROVAL` thông qua Toast sau khi request đã lỡ gửi đi. Trải nghiệm UX này sai với cam kết thiết kế.

## 4. Luồng Reconnect của Group Order chỉ là Fake/Mock
- **Tập tin:** `apps/customer-pwa/src/hooks/useGroupOrder.ts`
- **Vấn đề:** Trong `taskdetailf2.md` ghi rất rõ: khi reconnect sẽ tự động gọi API `GET /group-order/:tableId/cart` để đồng bộ lại giỏ hàng (tránh lọt event). Nhưng code thực tế trong callback reconnect (dòng 27-32) chỉ thực hiện `console.log` và set cứng 1 món dữ liệu Mock:
  ```typescript
  setItems([
    { id: 'm1', name: 'Bạc Xỉu (Mock Reconnect)', price: 35000, quantity: 1, addedBy: 'Khách A' }
  ]);
  ```
- **Hậu quả:** Khi ứng dụng PWA của khách hàng mất mạng và có lại, thay vì gọi API để khôi phục đúng danh sách món, giỏ hàng sẽ bị chèn cứng món "Bạc Xỉu (Mock Reconnect)". Đây là code tạm bợ (mock) chưa hoàn thiện cho Production.

## 5. Tổng kết
Thành viên F2 đã thực hiện khá đầy đủ về mặt số lượng component và layout, tuy nhiên ở các tính năng phức tạp tích hợp (Realtime, Reconnect, và Dynamic Component Canvas), code vẫn đang ở trạng thái Mock/Giả lập và thiếu đồng bộ với hệ thống thật của Backend.
