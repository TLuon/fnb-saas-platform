# Báo Cáo Tiến Độ (Progress) & Kiểm Thử - Vai Trò F1

Tài liệu này dùng để theo dõi tiến độ thực hiện các nhiệm vụ của đội F1, ghi nhận các lỗi đã xử lý, kết quả kiểm thử liên kết hệ thống, và các lưu ý quan trọng trong quá trình tích hợp. Khi bắt đầu hoặc hoàn thành một công việc, hãy cập nhật trạng thái tại đây.

---

## 1. Tổng Quan Tiến Độ

| Nhóm Nhiệm Vụ | Tổng số Task | Đang làm (`In-progress`) | Hoàn thành (`Completed`) | Tỷ lệ hoàn thành |
|---|---|---|---|---|
| **1. Tích hợp & Sửa lỗi Handoff** | 4 | 0 | 4 | 100% |
| **2. Màn hình KDS Dashboard** | 4 | 0 | 4 | 100% |
| **3. Backend Core & API (NestJS)**| 4 | 0 | 4 | 100% |
| **4. Kiểm thử & Bàn giao tổng thể**| 3 | 0 | 3 | 100% |
| **Tổng cộng** | **15** | **0** | **15** | **100%** |

*Trạng thái cập nhật gần nhất:* `2026-09-05` (Hoàn thành lộ trình F1).

---

## 2. Nhật Ký Chi Tiết Tiến Độ Nhiệm Vụ

### Mục 1: Tích hợp & Sửa lỗi Handoff từ F2
- [x] **1.1. FloorMap Canvas Integration:** 
  *   *Trạng thái:* `Completed`
  *   *Ghi chú:* Đã hoàn thiện FloorMapCanvas, thay thế CSS Grid cũ, hỗ trợ hit-test và zoom/pan mượt mà.
- [x] **1.2. Realtime Auth Token:** 
  *   *Trạng thái:* `Completed`
  *   *Ghi chú:* Đã đọc JWT từ cookie truyền vào realtimeClient thay vì dùng mock.
- [x] **1.3. Maker-Checker UI Validation:** 
  *   *Trạng thái:* `Completed`
  *   *Ghi chú:* Nút Phê duyệt đã bị disable nếu makerId trùng với user đăng nhập.
- [x] **1.4. Group-Order Reconnect Real Snapshot:** 
  *   *Trạng thái:* `Completed`
  *   *Ghi chú:* Đã có logic listen socket reconnect để fetch cart mới từ backend.

### Mục 2: Phát triển Màn hình KDS (Kitchen Display System - Staff Dashboard)
- [x] **2.1. Khởi tạo trang KDS:** 
  *   *Trạng thái:* `Completed`
  *   *Ghi chú:* Đã tạo KDS.tsx và phân quyền AuthGuard đầy đủ.
- [x] **2.2. Kết nối `realtimeClient` lắng nghe Order mới:** 
  *   *Trạng thái:* `Completed`
  *   *Ghi chú:* Lắng nghe sự kiện new_order từ gateway thành công.
- [x] **2.3. Xây dựng giao diện Kanban 3 cột:** 
  *   *Trạng thái:* `Completed`
  *   *Ghi chú:* Thiết kế UI Kanban và elapsed timer.
- [x] **2.4. Thao tác chuyển trạng thái đơn hàng:** 
  *   *Trạng thái:* `Completed`
  *   *Ghi chú:* Các nút thao tác state chuyển động có thêm Rollback Optimistic UI.

### Mục 3: Phát triển Backend Core & API (NestJS - `apps/api`)
- [x] **3.1. Group-Order Service (Redis/Socket.IO):** 
  *   *Trạng thái:* `Completed`
  *   *Ghi chú:* Đã ứng dụng Redis WATCH để lock tránh race condition.
- [x] **3.2. KDS Event Publisher:** 
  *   *Trạng thái:* `Completed`
  *   *Ghi chú:* KitchenGateway xử lý các order realtime.
- [x] **3.3. Payment & Webhook Mock:** 
  *   *Trạng thái:* `Completed`
  *   *Ghi chú:* PaymentController xử lý động payload từ webhook.
- [x] **3.4. Maker-Checker API Guard:** 
  *   *Trạng thái:* `Completed`
  *   *Ghi chú:* Đã bắt lỗi 6002 nếu tự duyệt và đăng ký trên AppModule.

### Mục 4: Kiểm thử & Bàn giao tổng thể (Integration & Testing)
- [x] **4.1. Unit Test & Integration Test cho API:** 
  *   *Trạng thái:* `Completed`
  *   *Ghi chú:* Test chạy thành công trên Node.js môi trường giả lập, coverage qua yêu cầu.
- [x] **4.2. Chạy thử nghiệm End-to-End toàn luồng:** 
  *   *Trạng thái:* `Completed`
  *   *Ghi chú:* Khách -> Giỏ chung -> Thanh toán -> KDS đều qua.
- [x] **4.3. Báo cáo tổng thể & Bàn giao đồ án:** 
  *   *Trạng thái:* `Completed`
  *   *Ghi chú:* F1 đã ghi báo cáo Walkthrough (walkthrough.md).

---

## 3. Nhật Ký Sửa Lỗi (Diagnose & Bug-Fix Log)

*Phần này dành cho F1 ghi lại các lỗi kỹ thuật phát sinh trong quá trình làm việc và cách khắc phục.*

| Mã Lỗi / Triệu Chứng | Nguyên nhân | Cách khắc phục | Người sửa |
|---|---|---|---|
| *VD: Lệch múi giờ hiển thị trên KDS* | *Database lưu UTC nhưng Client parse giờ Local không đồng bộ* | *Sử dụng thư viện `dayjs` bọc lại định dạng trước khi render* | *B2* |
| | | | |
| | | | |

---

## 4. Kết Quả Kiểm Thử Tích Hợp (Integration Testing Results)

*Ghi lại bằng chứng (Evidence) kiểm thử thành công các luồng tích hợp cốt lõi.*

1.  **Luồng Group-Order (Merge Giỏ hàng & Reconnect):**
    *   *Phương pháp thử:* Unit Test bằng Jest & giả lập Redis Client, reconnect logic trên FE.
    *   *Kết quả:* Đồng bộ đúng version và items. Không ghi đè data.
    *   *Trạng thái:* ✅ `Passed`
2.  **Luồng Maker-Checker Guard (Chặn tự phê duyệt):**
    *   *Phương pháp thử:* Unit Test MakerCheckerGuard và kiểm chứng disable UI trên Staff Dashboard.
    *   *Kết quả:* Throw đúng HTTP 403 (ERR_6002).
    *   *Trạng thái:* ✅ `Passed`
3.  **Luồng Webhook & Trigger CDP (Cộng điểm loyalty & nâng hạng thành viên):**
    *   *Phương pháp thử:* POST request payload động gửi vào PaymentController.
    *   *Kết quả:* Cập nhật đúng chi nhánh.
    *   *Trạng thái:* ✅ `Passed`
4.  **Luồng WebSocket KDS (Nhận đơn hàng thời gian thực):**
    *   *Phương pháp thử:* Gửi emit từ Postman/Mock script -> giao diện Kanban bắt sóng.
    *   *Kết quả:* Đẩy order lên cột `PENDING` realtime.
    *   *Trạng thái:* ✅ `Passed`
