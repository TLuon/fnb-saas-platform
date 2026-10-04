# REALTIME_EVENTS.md — Hợp Đồng Kênh Realtime

> Phụ thuộc: `ERD.md` (payload trùng tên cột), `API_CONTRACT.md` (endpoint nào bắn event nào).
> Cơ chế được chốt như sau: **Supabase Realtime chỉ dùng cho thay đổi bảng `tables`**. Client nhận row change từ WAL rồi map sang domain event `table_status_changed` ở `realtime-client.ts`; Supabase không tự phát event nghiệp vụ tùy chỉnh.
> Dùng **Socket.IO** cho các event nghiệp vụ còn lại: `kds_new_ticket`, `kds_item_status_changed`, `group_order_cart_updated`, `unmatched_transaction_created`, `support_ticket_urgent_created`. Backend emit sau khi transaction/Redis write thành công. Mọi handshake và thao tác join room đều phải xác thực JWT và kiểm tra `tenant_id`, `branch_id`, `role_app`.

## 1. Quy ước đặt tên kênh (channel)

```
tables:{branch_id}                  -- trạng thái toàn bộ bàn của 1 chi nhánh
kds:{branch_id}                     -- màn hình bếp/bar của 1 chi nhánh
group_order:{tenant_id}:{table_id}  -- phiên gọi món nhóm của 1 bàn cụ thể
support:{tenant_id}                 -- kênh nội bộ CSKH (ticket mới, giao dịch lỗi mới)
```

## 2. Danh sách sự kiện

### 2.1. `table_status_changed`
- **Kênh:** `tables:{branch_id}` (Supabase Realtime subscribe bảng `tables`; FE lọc theo các `floor_id` thuộc branch và map row change sang event này)
- **Bắn khi:** `PATCH /tables/:id/status`, webhook đặt cọc thành công (`POST /reservations/webhook/mock-payment`), `POST /orders` (check-in → OCCUPIED)
- **Payload:**
```json
{
  "table_id": "uuid",
  "table_code": "B01",
  "old_status": "AVAILABLE",
  "new_status": "RESERVED",
  "current_order_id": "uuid | null"
}
```
- **Người nhận:** Live Floor Map (Staff), Floor Editor preview (Owner), màn hình khách hàng khác đang xem cùng sơ đồ

### 2.2. `kds_new_ticket`
- **Kênh:** `kds:{branch_id}`
- **Cơ chế:** Socket.IO — emit thủ công từ NestJS (payload gộp nhiều `order_items` theo `station`)
- **Bắn khi:** `POST /orders/:id/submit-kitchen`
- **Payload:**
```json
{
  "order_id": "uuid",
  "table_code": "B01",
  "station": "BAR | KITCHEN",
  "items": [
    { "order_item_id": "uuid", "product_name": "Cà phê sữa đá", "quantity": 2, "modifiers": ["ít đường", "ít đá"] }
  ]
}
```
- **Người nhận:** Màn hình KDS Bar / KDS Kitchen (đã tách theo `station`)

### 2.3. `kds_item_status_changed`
- **Kênh:** `kds:{branch_id}`
- **Cơ chế:** Socket.IO — emit thủ công sau khi cập nhật thành công
- **Bắn khi:** `PATCH /orders/:id/items/:itemId/kitchen-status`
- **Payload:** `{ "order_item_id": "uuid", "kitchen_status": "READY" }`
- **Người nhận:** POS của Staff (để biết món nào đã sẵn sàng phục vụ)

### 2.4. `group_order_cart_updated`
- **Kênh:** `group_order:{tenant_id}:{table_id}`
- **Bắn khi:** `POST /group-order/:tableId/cart/items` (hoặc sửa/xóa món trong giỏ)
- **Nguồn dữ liệu:** Redis key `session:{tenant_id}:{table_id}` (không phải Postgres — service Socket.IO đọc Redis rồi broadcast)
- **Payload:**
```json
{
  "table_id": "uuid",
  "cart_items": [
    { "product_id": "uuid", "product_name": "Trà đào", "quantity": 1, "added_by_customer_id": "uuid", "added_by_name": "Khách 2" }
  ],
  "cart_total": 45000
}
```
- **Người nhận:** Mọi thiết bị đã join session của bàn đó (`POST /group-order/join`)

### 2.5. `unmatched_transaction_created`
- **Kênh:** `support:{tenant_id}`
- **Cơ chế:** Socket.IO — emit thủ công sau khi tạo `unmatched_transactions`
- **Bắn khi:** webhook thanh toán không khớp được `reservation_code`/`order_code`
- **Payload:** `{ "transaction_id": "uuid", "amount": 100000, "raw_transfer_content": "NGUYEN VAN A CK" }`
- **Người nhận:** Dashboard CSKH (badge số lượng hàng đợi tăng realtime)

### 2.6. `support_ticket_urgent_created`
- **Kênh:** `support:{tenant_id}`
- **Cơ chế:** Socket.IO — emit thủ công sau khi tạo ticket
- **Bắn khi:** CSAT ≤ 2 sao (theo `SPEC.md` Giai đoạn 5 — Luồng B)
- **Payload:** `{ "ticket_id": "uuid", "order_id": "uuid", "csat_score": 1, "complaint_note": "..." }`
- **Người nhận:** Dashboard CSKH (âm thanh cảnh báo ưu tiên)

## 3. Xử lý mất kết nối / đồng bộ lại

- Khi client reconnect vào `tables:{branch_id}`, FE phải gọi lại `GET /floors/:id/tables` để lấy snapshot đầy đủ trước khi tiếp tục lắng nghe diff — Supabase Realtime chỉ gửi các thay đổi *sau* thời điểm subscribe, không replay lịch sử.
- Với `group_order_cart_updated` (nguồn Redis), nếu socket rớt kết nối, khi reconnect FE gọi `GET /group-order/:tableId/cart` để đồng bộ lại toàn bộ giỏ hàng thay vì chờ event tiếp theo.

## 4. Phân công theo REALTIME (tham chiếu `PLAN_BE.md`, `PLAN_FE.md`)

| Kênh | Backend phát sự kiện | Frontend lắng nghe |
|---|---|---|
| `tables:*` | Supabase WAL sau khi B1 cập nhật bảng `tables` | F1 (Floor Editor + Live Floor Map), F2 (màn Đặt bàn trực quan + Support Board — tái sử dụng `FloorMapCanvas.tsx` theo `PLAN_FE.md` mục 2, cần map row change thành trạng thái bàn) |
| `kds:*` | B2 (Order/POS module) | F1 (KDS) |
| `group_order:*` | B2 (Group-Order module) | F2 (Customer PWA) |
| `support:*` | B2 (Support module) | F2 (Support Board) |
