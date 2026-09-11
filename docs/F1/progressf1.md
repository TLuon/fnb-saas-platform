# Báo Cáo Tiến Độ (Progress) - Vai Trò F1

## 1. Tổng Quan Tiến Độ

| Nhóm Nhiệm Vụ | Tổng số Task | Đang làm (`In-progress`) | Hoàn thành (`Completed`) | Tỷ lệ hoàn thành |
|---|---|---|---|---|
| **P0 - Nền tảng frontend vận hành** | 12 | 0 | 0 | 0% |
| **P1 - Component Floor Map dùng chung** | 20 | 0 | 1 | 5% |
| **P2 - Floor Editor cho Owner/Admin** | 17 | 0 | 1 | 6% |
| **P3 - Live Floor Map** | 13 | 0 | 1 | 8% |
| **P4 - POS Order Screen** | 20 | 0 | 1 | 5% |
| **P5 - KDS Kitchen và KDS Bar** | 18 | 0 | 2 | 11% |
| **P6 - Test, performance và bàn giao F2** | 15 | 0 | 0 | 0% |
| **Các Nhiệm vụ bổ sung** | 8 | 0 | 1 | 13% |

---

## 2. Nhật Ký Chi Tiết Tiến Độ Nhiệm Vụ

### P0 - Nền tảng frontend vận hành
- [ ] Xác nhận API thật và bỏ phụ thuộc mock server trong happy path.
- [ ] Dùng API client chung do F2 sở hữu với base URL từ env.
- [ ] Tự gắn Bearer token.
- [ ] Xử lý 401, 403, 422, 500 theo `error.code`.
- [ ] Tạo loading skeleton.
- [ ] Tạo empty state.
- [ ] Tạo error state có retry.
- [ ] Tạo reconnect state cho Socket.IO/Supabase Realtime.
- [ ] Lấy current user/role/branch từ auth provider chung do F2 bàn giao.
- [ ] Không dùng `mock-token` hoặc `switchUser` trong luồng thật.
- [ ] Tạo permission helper cho route/action vận hành.
- [ ] Thống nhất layout shell với F2.

### P1 - Component Floor Map dùng chung
- [x] Tạo file `packages/ui-shared/src/FloorMapCanvas.tsx`
- [x] Nhận danh sách table từ API.
- [x] Dùng `pos_x`, `pos_y`, `width`, `height`, `shape`.
- [x] Render `circle`, `rectangle`, `square` nếu contract có.
- [x] Render label `table_code`/name.
- [x] Render capacity khi context cần.
- [x] Render màu status thống nhất.
- [x] Click table.
- [x] Chọn table.
- [x] Drag table khi `editable = true`.
- [x] Không drag khi `editable = false`.
- [x] Pan canvas.
- [x] Zoom canvas.
- [x] Pointer/touch support tối thiểu cho tablet.
- [x] Không nhầm click với drag.
- [x] Stable canvas dimension.
- [x] Không layout shift khi loading.
- [x] Expose callback `onTableMove`, `onTableSelect`, `onTableClick`.
- [x] Có legend status.
- [x] Có accessibility label hoặc table list fallback.

### P2 - Floor Editor cho Owner/Admin
- [x] Tạo file `apps/staff-dashboard/src/pages/FloorEditor.tsx`
- [x] Chọn floor.
- [x] Load table thật.
- [x] Kéo thả table.
- [x] Thay đổi position.
- [x] Thay đổi width/height.
- [x] Thay đổi shape.
- [x] Đổi table code/name.
- [x] Đổi capacity.
- [x] Tạo table mới.
- [ ] Xóa/deactivate table theo API rule.
- [x] Lưu từng table hoặc batch save.
- [x] Hiển thị lỗi từng update.
- [x] Dirty state.
- [ ] Reset thay đổi chưa lưu.
- [ ] Prevent overlap hoặc cảnh báo overlap.
- [x] Reload sau save để chứng minh dữ liệu persist.

### P3 - Live Floor Map
- [x] Tạo file `apps/staff-dashboard/src/pages/LiveFloorMap.tsx`
- [x] Chọn branch/floor.
- [x] Load snapshot từ `GET /floors/:id/tables`.
- [x] Subscribe `tables:{branch_id}`.
- [x] Update status không cần F5.
- [x] Hiển thị order đang mở nếu API trả về.
- [x] Click bàn để mở POS hoặc detail.
- [x] Staff được đổi status hợp lệ.
- [x] Owner xem layout nhưng không nhất thiết đổi status.
- [x] Reconnect: gọi snapshot trước rồi tiếp tục diff.
- [x] Hiển thị last updated.
- [x] Hiển thị connection state.
- [ ] Không lộ bàn branch khác.

### P4 - POS Order Screen
- [x] Tạo file `apps/staff-dashboard/src/pages/POS.tsx`
- [x] Chọn bàn.
- [x] Check-in bàn qua `POST /orders`.
- [x] Tải category/product thật (hoặc mock nếu chưa có API).
- [x] Lọc category.
- [x] Tìm product.
- [x] Thêm product.
- [ ] Chọn modifier.
- [x] Tăng/giảm quantity.
- [x] Xóa item.
- [ ] Ghi chú cho bếp.
- [ ] Gọi `POST /orders/:id/items`.
- [ ] Sửa item bằng `PATCH /orders/:id/items/:itemId`.
- [x] Submit kitchen.
- [x] Hiển thị subtotal/discount/final amount do backend trả.
- [x] Thanh toán theo quyền.
- [x] Hiển thị lỗi hết món, order khóa, payment fail.
- [x] Không tự tính/ghi đè total cuối cùng.
- [x] Không cho submit order rỗng.
- [ ] Xem order hiện tại khi reload.

### P5 - KDS Kitchen và KDS Bar
- [x] Tạo file `apps/staff-dashboard/src/pages/KDSKitchen.tsx`
- [x] Tạo file `apps/staff-dashboard/src/pages/KDSBar.tsx`
- [x] Load ticket snapshot.
- [x] Gọi `GET /api/v1/orders/kds?branch_id=&station=&status=` khi mở trang và sau reconnect.
- [x] Subscribe `kds:{branch_id}`.
- [x] Lọc đúng station.
- [x] Hiển thị order code/table.
- [x] Hiển thị items, quantity, modifier, note.
- [x] Hiển thị thời gian chờ.
- [x] Chuyển queued -> preparing.
- [x] Chuyển preparing -> ready.
- [x] Chuyển ready -> served.
- [ ] Hủy item nếu API cho phép.
- [x] Emit API status update.
- [x] Reconnect fetch lại queue.
- [ ] Không duplicate ticket.
- [x] Highlight ticket quá lâu.
- [ ] Có sound/visual notification nếu phù hợp.

### P6 - Test, performance và bàn giao F2
- [ ] Test canvas click vs drag.
- [ ] Test zoom/pan.
- [ ] Test 20-30 bàn.
- [ ] Test tablet width.
- [ ] Test reconnect realtime.
- [ ] Test status event cũ đến sau event mới.
- [ ] Test permission không cho role sai vào route.
- [ ] Test POS reload khi order đang mở.
- [ ] Test double click submit kitchen.
- [ ] Test KDS duplicate event.
- [ ] Test empty/error/loading.
- [ ] Viết usage guide cho FloorMap component.
- [ ] Bàn giao event payload cho F2.
- [ ] Bàn giao color/status mapping cho F2.
- [ ] Review integration với F2 ở customer floor map và support board.

### Các Nhiệm vụ bổ sung (Shift, Takeaway, Inventory)
- [x] Tạo file `apps/staff-dashboard/src/pages/ShiftManagement.tsx`
- [x] Quản lý Ca làm việc: Màn hình "Mở ca".
- [x] Quản lý Ca làm việc: Màn hình "Đóng ca" trên POS.
- [x] Đơn mang đi: Giao diện POS - Nút chuyển đổi (Toggle) giữa "Dine-in" và "Takeaway".
- [x] Đơn mang đi: Bỏ qua bước chọn bàn ở mode Takeaway.
- [x] Đơn mang đi: KDS phân biệt đơn tại bàn và đơn mang đi.
- [x] Đơn mang đi: Tab "Đơn Online/Mang đi" riêng trên giao diện POS (Đồng bộ Gap 1).
- [ ] Inventory: Lắng nghe event `product_out_of_stock` qua socket (Đồng bộ Gap 3).

---

## 3. Nhật Ký Sửa Lỗi (Diagnose & Bug-Fix Log)

| Mã Lỗi / Triệu Chứng | Nguyên nhân | Cách khắc phục | Người sửa |
|---|---|---|---|
| *VD: Lệch múi giờ hiển thị trên KDS* | *Database lưu UTC nhưng Client parse giờ Local không đồng bộ* | *Sử dụng thư viện `dayjs` bọc lại định dạng trước khi render* | *B2* |
| | | | |

---

## 4. Kết Quả Kiểm Thử Tích Hợp (Integration Testing Results)

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
