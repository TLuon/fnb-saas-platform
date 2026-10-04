# Danh sách Nhiệm vụ - Vai trò F1 (Backend, KDS & Floor Map Integration)

Dựa trên kết quả bàn giao của F2 (Customer & Admin Frontend) và các yêu cầu kiến trúc của hệ thống, F1 sẽ đảm nhận các nhiệm vụ kỹ thuật cốt lõi sau. Khi hoàn thành từng đầu việc, hãy đánh dấu `[x]`.

## 1. Tích hợp & Sửa lỗi Handoff từ F2
- [ ] 1.1. **FloorMap Canvas Integration:** Tích hợp component Canvas bản đồ bàn vào `apps/customer-pwa/src/app/floors/[id]/page.tsx` thay cho CSS Grid cứng của F2.
- [ ] 1.2. **Realtime Auth Token:** Cập nhật `useGroupOrder.ts` và `realtime-client.ts` ở PWA để truyền JWT thật thay vì chuỗi `'mock_jwt_token'`.
- [ ] 1.3. **Maker-Checker UI Validation:** Bổ sung logic vô hiệu hóa (`disabled={tx.makerId === currentUser.id}`) tại nút Phê duyệt trong `SupportBoard.tsx` nhằm ngăn chặn `ERR_6002_SELF_APPROVAL` trước khi gọi API.
- [ ] 1.4. **Group-Order Reconnect Real Snapshot:** Thay thế logic mock re-connect giỏ hàng bằng lệnh gọi thực tế `GET /group-order/:tableId/cart` khi Socket.IO kết nối lại (`reconnect`).

## 2. Phát triển Màn hình KDS (Kitchen Display System - Staff Dashboard)
- [ ] 2.1. Khởi tạo trang KDS tại `apps/staff-dashboard/src/pages/KDS.tsx` tuân thủ tuyệt đối quy chuẩn `THEMED_CONSOLIDATED.md` và dùng chung Layout với Sidebar/Header phân quyền.
- [ ] 2.2. Kết nối `realtimeClient` để lắng nghe sự kiện đơn hàng mới đẩy từ quầy/PWA (`new_order`).
- [ ] 2.3. Xây dựng giao diện Kanban 3 cột: **Chờ chế biến** (`PENDING`), **Đang làm** (`PREPARING`), **Hoàn thành** (`READY/COMPLETED`).
- [ ] 2.4. Thêm nút thao tác nhanh cho đầu bếp chuyển trạng thái món ăn/đơn hàng kèm gọi API cập nhật tương ứng.

## 3. Phát triển Backend Core & API (NestJS - `apps/api`)
- [ ] 3.1. **Group-Order Service:** Xây dựng module Group-Order trên Backend xử lý gộp giỏ hàng Realtime (Redis/Socket.IO) theo phiên bàn (`tableId`).
- [ ] 3.2. **KDS Event Publisher:** Cấu hình WebSocket Gateway trong NestJS để phát (emit) sự kiện `new_order` và `order_status_updated` tới KDS.
- [ ] 3.3. **Payment & Webhook Mock:** Hoàn thiện API tiếp nhận VietQR Webhook giả lập, cập nhật trạng thái đơn hàng và kích hoạt trigger CDP (loyalty points, total spent).
- [ ] 3.4. **Maker-Checker API Guard:** Đảm bảo Backend từ chối và trả về mã lỗi `ERR_6002_SELF_APPROVAL` nếu `maker_id === checker_id`.

## 4. Kiểm thử & Bàn giao tổng thể (Integration & Testing)
- [ ] 4.1. Viết Unit Test & Integration Test cho các API backend mới bằng Jest (`apps/api/test`).
- [ ] 4.2. Chạy thử nghiệm End-to-End luồng từ Khách đặt món chung qua PWA -> Bếp nhận đơn trên KDS Dashboard -> Thanh toán QR -> Hoàn thành đơn.
- [ ] 4.3. Cập nhật `progressf1.md` và chuẩn bị báo cáo bàn giao chung cho toàn đồ án.
