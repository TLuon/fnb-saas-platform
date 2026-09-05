# Chi Tiết Triển Khai Nhiệm Vụ F1 (Backend, KDS & Floor Map Integration)

Tài liệu này cung cấp hướng dẫn triển khai kỹ thuật chi tiết, sơ đồ thiết kế, các files cần sửa đổi và mã giả/cấu trúc code cho từng đầu việc của đội F1. F1 cần dựa vào đây để phát triển và tích hợp hoàn chỉnh với nền tảng F2 đã bàn giao.

---

## 1. Tích hợp & Sửa lỗi Handoff từ F2

### 1.1. FloorMap Canvas Integration (Sơ đồ bàn tương tác Canvas)
*   **Mục tiêu:** Thay thế layout CSS Grid tĩnh hiện tại (`FloorMapGrid.tsx`) bằng một Component Canvas (`FloorMapCanvas.tsx`) cho phép hiển thị bàn trực quan theo tọa độ thực, có khả năng Zoom, Pan (kéo dời), và chọn bàn mượt mà.
*   **Vị trí file cần tạo/chỉnh sửa:**
    *   Tạo: `apps/customer-pwa/src/components/FloorMapCanvas.tsx`
    *   Chỉnh sửa: `apps/customer-pwa/src/components/FloorMapDynamic.tsx`
*   **Thiết kế kỹ thuật:**
    *   **Data Structure:** Bảng `tables` trong DB cần có thêm các cột `coord_x`, `coord_y`, `width`, `height`, `shape` ('circle' | 'rectangle').
    *   **Canvas rendering:** Sử dụng HTML5 `<canvas>` hoặc thư viện nhẹ như `konva` / `pixi.js` (nếu dự án cho phép). Tuy nhiên, để tối ưu hiệu năng và tránh thêm bundle size, khuyến khích viết bằng **HTML5 Canvas API thuần** bọc trong React `useRef` và `useEffect`.
    *   **Trạng thái màu sắc:** Phải import hàm `getTableColor(status)` từ `@fnb/utils` để vẽ màu nền cho các bàn, đảm bảo đồng bộ tuyệt đối với Design System:
        *   `AVAILABLE` (Trống): Kem nhẹ (`var(--color-brand-neutral)` hoặc `#FAF7F3`) viền Primary.
        *   `OCCUPIED` (Có khách): Nâu sẫm thương hiệu (`#543310`).
        *   `CLEANING` (Đang dọn): Xám trung tính (`#E6E0D8`).
        *   `PENDING_LOCK` (Đang giữ bàn): Cam hổ phách nhấp nháy (`#D67D3E`).
    *   **Logic tương tác Canvas:**
        *   Tính toán ma trận transformation (zoom, pan) khi người dùng kéo chuột/vuốt màn hình.
        *   Bắt sự kiện click/tap bằng cách tính tọa độ click tương đối so với Canvas và kiểm tra va chạm (Bounding Box Check) với danh sách bàn.
        *   Khi click trúng bàn trống (`AVAILABLE`), gọi callback `onTableClick(table)`.
    *   **Tích hợp không lỗi SSR:**
        *   Chỉ cần sửa import trong `FloorMapDynamic.tsx` để trỏ vào `FloorMapCanvas.tsx`.
        *   Vì `FloorMapDynamic.tsx` đã bọc Next.js `dynamic(..., { ssr: false })`, component Canvas mới sẽ chạy an toàn ở phía Client mà không bị lỗi "window is not defined".

### 1.2. Realtime Auth Token (JWT Thật cho Client Realtime)
*   **Mục tiêu:** Loại bỏ token mock `'mock_jwt_token'` đang hardcode ở phía Client khi kết nối Supabase Realtime và Socket.IO, thay thế bằng JWT thật lấy từ Cookie/Session của User đã đăng nhập.
*   **Vị trí file cần chỉnh sửa:**
    *   `apps/customer-pwa/src/hooks/useGroupOrder.ts`
    *   `packages/utils/src/realtime-client.ts`
*   **Phương án triển khai:**
    *   Đọc JWT token từ cookie ở phía Client (Next.js) bằng cách dùng thư viện `js-cookie` hoặc API `document.cookie` thủ công.
    *   **Cấu trúc chỉnh sửa trong `useGroupOrder.ts`:**
        ```typescript
        // Lấy JWT thật từ cookie
        const getCookie = (name: string) => {
          const value = `; ${document.cookie}`;
          const parts = value.split(`; ${name}=`);
          if (parts.length === 2) return parts.pop()?.split(';').shift();
          return null;
        };

        const token = getCookie('auth_token') || '';
        // Truyền token thật này vào hàm khởi tạo realtimeClient
        ```
    *   Cập nhật `realtimeClient.connect(token)` trong `@fnb/utils` để truyền JWT vào header `Authorization: Bearer <token>` của Socket.IO connection option hoặc thông tham số `apikey` / `access_token` của Supabase Realtime.

### 1.3. Maker-Checker UI Validation (Chặn tự phê duyệt trên Frontend)
*   **Mục tiêu:** Ngăn chặn nhân viên tự ý phê duyệt các giao dịch do chính mình đề xuất ngay trên giao diện `SupportBoard.tsx`, tránh phát sinh request lỗi `ERR_6002_SELF_APPROVAL`.
*   **Vị trí file cần chỉnh sửa:**
    *   `apps/staff-dashboard/src/pages/SupportBoard.tsx`
*   **Mã giả triển khai:**
    ```tsx
    // Lấy thông tin user hiện tại đang đăng nhập từ authStore
    const { user: currentUser } = useAuthStore();

    // Trong danh sách thẻ Tra soát (transactions), khi render nút "Phê duyệt" (Approve):
    const isSelfCreated = tx.makerId === currentUser?.id;

    return (
      <div className="flex gap-2">
        <button
          disabled={isSelfCreated}
          onClick={() => handleApprove(tx.id)}
          className={`px-4 py-2 rounded-lg font-bold transition-all duration-200
            ${isSelfCreated 
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-60' 
              : 'bg-[var(--color-brand-primary)] text-white hover:bg-[var(--color-brand-primary-dark)]'
            }`}
          title={isSelfCreated ? "Bạn không thể tự phê duyệt đề xuất của chính mình!" : "Duyệt giao dịch"}
        >
          Phê duyệt
        </button>
        {isSelfCreated && (
          <span className="text-xs text-red-500 italic mt-1 block">
            * Yêu cầu người kiểm duyệt khác (Checker) phê duyệt
          </span>
        )}
      </div>
    );
    ```

### 1.4. Group-Order Reconnect Real Snapshot (Đồng bộ giỏ hàng khi Reconnect)
*   **Mục tiêu:** Thay thế mock logic khi Socket.IO mất mạng và kết nối lại bằng việc gọi API thật để kéo snapshot giỏ hàng chung mới nhất từ Server, đảm bảo khách hàng không bị lệch món.
*   **Vị trí file cần chỉnh sửa:**
    *   `apps/customer-pwa/src/hooks/useGroupOrder.ts`
*   **Thiết kế kỹ thuật:**
    *   Lắng nghe sự kiện `reconnect` hoặc `connect` (sau khi đã có một lần ngắt kết nối `disconnect`) từ Socket.IO client.
    *   Khi sự kiện xảy ra, kích hoạt hàm fetch API:
        ```typescript
        socket.on('reconnect', async () => {
          try {
            // Gọi api-client đã cấu hình sẵn của F2
            const response = await apiClient.get(`/group-order/${tableId}/cart`);
            const latestCart = response.data;
            
            // Cập nhật lại Zustand Store của Group Cart
            groupCartStore.setState({ items: latestCart.items, version: latestCart.version });
            showInfo('Đã đồng bộ lại giỏ hàng nhóm!');
          } catch (err) {
            showError('Không thể đồng bộ lại giỏ hàng nhóm khi kết nối lại.');
          }
        });
        ```

---

## 2. Phát triển Màn hình KDS (Kitchen Display System - Staff Dashboard)

### 2.1. Khởi tạo KDS Page & Khung Bố cục
*   **Mục tiêu:** Tạo trang KDS hiển thị các đơn hàng chờ chế biến cho bếp, bọc trong hệ thống layout và kiểm soát phân quyền.
*   **File cần tạo:**
    *   `apps/staff-dashboard/src/pages/KDS.tsx`
*   **Tích hợp Routing & Khung:**
    *   Khai báo route `/kds` trong `apps/staff-dashboard/src/App.tsx`.
    *   Bọc route bằng `<AuthGuard allowedRoles={['OWNER', 'STAFF']}>`.
    *   Sử dụng CSS Variables (`var(--color-brand-*)`) và font chữ serif cho tiêu đề để giữ đúng tính sang trọng của Design System.

### 2.2. Kết nối Realtime lắng nghe Order mới
*   **Mục tiêu:** Nhận đơn hàng mới tức thời từ PWA/Quầy mà không cần reload trang.
*   **Chi tiết triển khai:**
    *   Sử dụng `realtimeClient` từ `@fnb/utils` để lắng nghe sự kiện từ Socket.IO gateway của Backend.
    *   Kênh đăng ký: `kitchen:{branch_id}`
    *   Sự kiện lắng nghe:
        *   `new_order`: Đơn hàng mới vừa được đặt và thanh toán/xác nhận thành công.
        *   `order_items_updated`: Đơn hàng được chỉnh sửa hoặc bổ sung món mới từ giỏ hàng chung.
    *   Khi nhận sự kiện, tự động chèn đơn hàng vào cột đầu tiên ("Chờ chế biến") kèm hiệu ứng nhấp nháy hoặc âm thanh báo hiệu nhẹ (beeping).

### 2.3. Xây dựng Giao diện Kanban 3 cột
*   **Mục tiêu:** Quản lý quy trình chế biến hiệu quả theo chuẩn KDS chuyên nghiệp.
*   **Thiết kế giao diện:**
    *   Chia màn hình thành 3 cột lớn chiếm trọn chiều rộng (Flexbox hoặc Grid 3 cột):
        1.  **Chờ chế biến (`PENDING`):** Chứa các order mới đẩy xuống. Các thẻ được xếp theo thứ tự thời gian đặt (cũ nhất ở trên cùng để làm trước).
        2.  **Đang làm (`PREPARING`):** Bếp đã nhận và đang chuẩn bị món.
        3.  **Hoàn thành (`READY` / `COMPLETED`):** Món đã làm xong, chờ nhân viên chạy bàn mang ra.
    *   **Thành phần của một Thẻ Đơn hàng (Order Card):**
        *   *Header:* Số thứ tự đơn (vd: `#042`), Tên bàn (vd: `Bàn 5`), Thời gian đặt món.
        *   *Body:* Danh sách các món ăn kèm số lượng, ghi chú đặc biệt của khách hàng (vd: "không đá", "ít ngọt") được format nổi bật bằng chữ in đậm màu Accent (`#D67D3E`).
        *   *Footer:* Bộ đếm thời gian trôi qua (Elapsed Timer) từ lúc đơn được tạo để cảnh báo bếp nếu quá hạn chế biến (vd: chuyển sang màu Đỏ nếu đơn hàng nằm ở cột Chờ quá 15 phút).

### 2.4. Nút thao tác chuyển trạng thái đơn hàng/món
*   **Mục tiêu:** Cập nhật tiến độ nấu nướng ngược lại cho hệ thống (để POS biết chạy bàn, PWA hiển thị tiến độ món cho khách).
*   **Chi tiết hành động:**
    *   **Thao tác kéo/thả hoặc Nút bấm (Button click):** Khuyến khích dùng nút bấm to, rõ ràng vì bếp thường dùng màn hình cảm ứng hoặc máy tính bảng dính dầu mỡ.
        *   Tại cột `PENDING`: Có nút **"Bắt đầu làm"** -> Khi bấm, gọi API `PATCH /orders/:orderId/status` với body `{ status: 'PREPARING' }` và di chuyển thẻ sang cột Đang làm.
        *   Tại cột `PREPARING`: Có nút **"Hoàn thành món"** -> Khi bấm, gọi API và di chuyển thẻ sang cột `READY`.
        *   Có thêm nút **"Báo hết món"** để hủy món/báo hết hàng trực tiếp lên hệ thống Menu.

---

## 3. Phát triển Backend Core & API (NestJS - `apps/api`)

### 3.1. Group-Order Service (Quản lý giỏ hàng chung bằng Redis)
*   **Mục tiêu:** Lưu trữ giỏ hàng tạm thời của các thành viên cùng bàn và đồng bộ hóa tức thời qua WebSocket.
*   **Thiết kế luồng dữ liệu:**
    *   Khi khách hàng quét mã bàn và mở giỏ hàng, client kết nối vào Socket.IO room `table:{tableId}`.
    *   Giỏ hàng chung được lưu trữ trong **Redis** dưới dạng một Hash map với key: `group_order:table_id:{tableId}`.
    *   **Các API chính cần viết:**
        *   `GET /group-order/:tableId/cart`: Lấy snapshot giỏ hàng chung từ Redis. Nếu chưa có, tạo mới giỏ hàng trống.
        *   `POST /group-order/:tableId/items`: Thêm món vào giỏ hàng chung (lưu rõ thông tin `userId` hoặc `clientName` của người đặt món đó).
        *   `DELETE /group-order/:tableId/items/:itemId`: Xóa/giảm số lượng món khỏi giỏ hàng.
    *   **Đồng bộ Realtime:** Sau khi cập nhật giỏ hàng trong Redis thành công, Backend gửi sự kiện `group_order_cart_updated` kèm theo payload giỏ hàng mới nhất tới toàn bộ client đang trong room `table:{tableId}`.

### 3.2. KDS Event Publisher (WebSocket Gateway)
*   **Mục tiêu:** Phát và định tuyến chính xác các sự kiện đơn hàng phục vụ KDS.
*   **Thiết kế NestJS Gateway:**
    *   Tạo `KitchenGateway` sử dụng thư viện `@nestjs/websockets`.
    *   Khi một đơn hàng được tạo thành công từ luồng Thanh toán (hoặc khi bếp chuyển trạng thái đơn hàng), gọi hàm `emitToBranch(branchId, event, payload)` của gateway để đẩy tin nhắn tới đúng chi nhánh.
    *   Payload sự kiện `new_order`:
        ```json
        {
          "orderId": "ORD-123456",
          "tableName": "Bàn 3",
          "createdAt": "2026-09-04T12:00:00Z",
          "items": [
            { "productId": "PROD-01", "name": "Cà phê Sữa Đá", "quantity": 2, "notes": "Ít sữa" },
            { "productId": "PROD-05", "name": "Bánh Croissant", "quantity": 1, "notes": "Hâm nóng" }
          ]
        }
        ```

### 3.3. Payment & Webhook Mock (Xử lý giao dịch VietQR giả lập & CDP)
*   **Mục tiêu:** Nhận callback báo có tiền từ ngân hàng giả lập, hoàn tất đơn hàng và tự động cập nhật hệ thống CDP (Loyalty).
*   **Thiết kế API Webhook:**
    *   Endpoint: `POST /payment/webhook/vietqr`
    *   **Quy trình xử lý:**
        1.  Trích xuất thông tin giao dịch: `transaction_amount`, `payment_content` (chứa mã reservation/order code).
        2.  Tra cứu trong bảng `reservations` hoặc `orders` khớp với mã code nhận được.
            *   *Trường hợp không khớp:* Lưu giao dịch vào bảng `unmatched_transactions` phục vụ luồng Maker-Checker của SUPPORT. Trả về mã lỗi logic `ERR_3002_PAYMENT_CONTENT_MISMATCH`.
            *   *Trường hợp khớp:*
                *   Cập nhật trạng thái bàn sang `OCCUPIED`.
                *   Cập nhật trạng thái đơn hàng sang `PAID` và bắn sự kiện `new_order` sang KDS.
                *   Kích hoạt PostgreSQL trigger `trg_order_completed` hoặc gọi trực tiếp CDP Service để:
                    *   Cộng điểm tích lũy (`loyalty_points`) cho khách hàng: `10,000 VND = 1 điểm`.
                    *   Cập nhật tổng chi tiêu (`total_spent`) để tính toán lại phân hạng thành viên (Membership Tier: Bronze -> Silver -> Gold).

### 3.4. Maker-Checker API Guard (Chặn self-approval ở tầng Backend)
*   **Mục tiêu:** Ràng buộc bảo mật tuyệt đối, đảm bảo quy tắc Maker-Checker không thể bị vượt qua bằng cách gọi API trực tiếp.
*   **Thiết kế NestJS Guard / Interceptor:**
    *   Tạo `MakerCheckerGuard` áp dụng cho endpoint phê duyệt giao dịch tra soát `POST /support/transactions/:id/approve`.
    *   **Logic kiểm tra:**
        1.  Lấy ID người dùng từ JWT đính kèm trong request (chính là `checker_id`).
        2.  Truy vấn cơ sở dữ liệu để lấy bản ghi giao dịch đề xuất cần duyệt theo `:id`. Lấy ra `maker_id` (người tạo đề xuất).
        3.  So sánh: `if (maker_id === checker_id)`.
        4.  Nếu trùng nhau: Ném ra ngoại lệ `ForbiddenException` đi kèm mã lỗi chuẩn hóa `ERR_6002_SELF_APPROVAL` định nghĩa trong `ERROR_CODES.md`.
        ```typescript
        if (makerId === checkerId) {
          throw new HttpException({
            code: 'ERR_6002_SELF_APPROVAL',
            message: 'Checker cannot be the same as Maker.'
          }, HttpStatus.FORBIDDEN);
        }
        ```

---

## 4. Kiểm thử & Bàn giao tổng thể (Integration & Testing)

### 4.1. Unit Test & Integration Test Backend
*   **Yêu cầu:** Viết tối thiểu 80% test coverage cho các API mới viết bằng Jest (NestJS testing framework).
*   **Các kịch bản Test trọng tâm:**
    *   *Group-Order Test:* Giả lập đồng thời 2 clients cùng thêm món vào giỏ hàng chung của 1 bàn, kiểm tra giỏ hàng Redis được merge chính xác và không bị ghi đè mất dữ liệu.
    *   *Maker-Checker Guard Test:* Viết integration test gửi request phê duyệt với token có ID trùng với maker và kỳ vọng nhận về HTTP 403 kèm mã lỗi `ERR_6002_SELF_APPROVAL`.
    *   *Webhook Race Condition Test:* Giả lập webhook gửi trùng lặp 2 lần cho cùng một giao dịch thành công, kiểm tra hệ thống chỉ xử lý cộng điểm tích lũy CDP đúng 1 lần duy nhất.

### 4.2. Kịch bản E2E Dry-run (Chạy thử nghiệm toàn trình)
Để xác nhận hệ thống hoạt động đồng bộ hoàn hảo trước khi bàn giao, F1 cần thực hiện luồng test thực tế sau:
1.  **Bước 1:** Khách hàng (Client A & B) quét mã QR Bàn 1 cùng lúc.
2.  **Bước 2:** Client A thêm "Cà phê sữa" vào giỏ hàng chung -> Client B thấy giỏ hàng cập nhật ngay lập tức hiển thị "Cà phê sữa (Bởi Khách A)".
3.  **Bước 3:** Tiến hành thanh toán qua giả lập VietQR -> Webhook kích hoạt -> Trạng thái Bàn 1 đổi sang "Có khách" trên sơ đồ Canvas của Client A & B.
4.  **Bước 4:** Màn hình KDS của Bếp nhận được order mới của Bàn 1 nổi lên ở cột "Chờ chế biến".
5.  **Bước 5:** Bếp bấm "Bắt đầu làm" -> Trạng thái đơn hàng cập nhật -> Bếp bấm "Hoàn thành" -> Khách hàng nhận được thông báo món ăn đã sẵn sàng.
6.  **Bước 6:** Kiểm tra dữ liệu CDP trong Admin Dashboard xem tài khoản của Khách A có được cộng điểm thưởng tương ứng với giá trị hóa đơn hay chưa.
