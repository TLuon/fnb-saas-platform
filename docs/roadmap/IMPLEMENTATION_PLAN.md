# F&B SaaS Platform - Implementation Roadmap

## 1. Mục đích tài liệu

Tài liệu này là checklist triển khai để đưa dự án từ trạng thái demo/mock hiện tại lên một hệ thống F&B có thể vận hành theo luồng thực tế.

Phạm vi bao gồm:

- Customer PWA.
- Staff Dashboard.
- NestJS API.
- Supabase Auth, Database, RLS và Realtime.
- Redis cho lock bàn và group order.
- Dữ liệu demo phục vụ phát triển và kiểm thử.

Tài liệu được sắp xếp theo dependency. Không nên nhảy qua phase trước nếu phase đó còn chưa đạt tiêu chí nghiệm thu, vì các phase sau sẽ phụ thuộc vào authentication, role, tenant và dữ liệu thật.

## 2. Hiện trạng cần lưu ý

### 2.1. Customer PWA

- Trang `/` đang chuyển thẳng tới `/login`.
- Trang `/login` đang tạo JWT giả trong cookie, chưa đăng nhập Supabase/API thật.
- Trang `/menu` đã tồn tại nhưng dùng `MOCK_MENU`.
- Cart, wallet và checkout phần lớn đang dùng Zustand/local state.
- Trang floor đang dùng danh sách bàn hard-code.
- `FloorMapDynamic` tự tính vị trí bàn theo index, chưa dùng `pos_x`, `pos_y`, `width`, `height`, `shape` từ database.
- Chưa có navigation hoàn chỉnh cho khách vãng lai.

### 2.2. Staff Dashboard

- `authStore` mặc định một user Owner và token mock.
- Chưa có màn hình login nhân viên hoàn chỉnh.
- Role đang được chuyển bằng state frontend, không lấy từ JWT/API thật.
- `AuthGuard` và Sidebar có khung phân quyền nhưng chưa phải security boundary đáng tin cậy.
- Chưa có Floor Editor thực sự trong dashboard.
- Một số màn hình đang dùng store/mock data thay vì API thật.

### 2.3. Backend và database

Backend đã có nhiều module và API contract cho:

- Auth.
- Floor và table.
- Menu.
- Staff.
- Reservation.
- Order/POS/KDS.
- Group order.
- Wallet và Coffee Pass.
- CDP/report.
- Support.

Database đã có cột vị trí bàn và endpoint `PATCH /tables/:id`, nhưng frontend chưa nối hoàn chỉnh vào phần này.

Seed hiện tại mới có dữ liệu mẫu nhỏ, chưa có script tự động tạo nhiều tài khoản Supabase Auth và profile tương ứng.

## 3. Nguyên tắc triển khai

1. Backend là nơi quyết định quyền, không tin role do frontend gửi lên.
2. Mọi request nghiệp vụ phải có tenant context và RLS phù hợp.
3. Tài chính, payment, wallet và refund phải đi qua API/service/RPC an toàn, không ghi trực tiếp từ frontend.
4. Server state lấy từ API; Zustand chỉ giữ UI state và realtime state ngắn hạn.
5. Customer vãng lai được xem catalog public nhưng phải đăng nhập khi tạo dữ liệu cá nhân hoặc order.
6. Mọi thay đổi quan trọng phải có loading, error, empty state và audit phù hợp.
7. Không chạy seed Auth bằng SQL thuần với UUID giả. Dùng Supabase Admin API ở server-side.
8. Mock server chỉ dùng cho phát triển tạm thời. Luồng production/demo chính phải chạy qua backend thật.
9. Mỗi phase phải có tiêu chí nghiệm thu trước khi chuyển phase tiếp theo.
10. Không sửa ngầm API contract hoặc role enum chỉ ở frontend.

## 4. Quyết định cần chốt trước khi code

### 4.1. Role nghiệp vụ

Database hiện tại có các role chính:

- `OWNER`.
- `STAFF`.
- `SUPPORT`.
- `CUSTOMER` được suy ra từ bảng `customers`.

MVP đã chốt chỉ dùng bốn role:

- `OWNER`.
- `STAFF`.
- `SUPPORT`.
- `CUSTOMER`.

Không tạo `MANAGER`, `KITCHEN` hoặc `BAR` thành role database trong MVP. KDS Bar/Kitchen được phân trạm bằng `categories.kitchen_station`.

Quyền chính:

| Role | Phạm vi chính |
|---|---|
| `OWNER` | Toàn quyền tenant, menu, nhân viên, layout, báo cáo, cấu hình |
| `STAFF` | Check-in bàn, POS, order, trạng thái bàn |
| `SUPPORT` | CSKH, unmatched payment, ticket, voucher |
| `CUSTOMER` | Menu, reservation, order, wallet, lịch sử cá nhân |

### 4.2. Tên Admin

Trong backend hiện role tương ứng với Admin thường là `OWNER`. Cần dùng thống nhất một trong hai cách:

- Tài khoản Admin có `role = OWNER`; hoặc
- Tạo role `ADMIN` mới ở toàn bộ hệ thống.

Đề xuất: dùng `OWNER` ở database/backend và hiển thị nhãn `Admin/Owner` trên UI để tránh thay đổi lớn không cần thiết.

### 4.3. Chiến lược login

Cần chốt:

- Customer: email/password, phone/password hay OTP.
- Staff: email/password hay PIN.
- Có bắt buộc đổi mật khẩu lần đầu hay không.
- Có MFA/TOTP cho Owner và thao tác tài chính hay không.

MVP nên dùng email/password thật qua Supabase Auth cho cả hai nhóm, sau đó mới bổ sung OTP/PIN nếu cần.

## 5. Thứ tự ưu tiên tổng quan

```text
P0  Chốt domain, role, môi trường và API contract
P1  Authentication và session thật
P2  Tenant/RLS/permission matrix ổn định
P3  Customer public storefront và menu thật
P4  Customer reservation và order thật
P5  Staff dashboard theo role
P6  Floor Editor kéo thả và đồng bộ customer
P7  POS/KDS/realtime vận hành
P8  Seed dữ liệu demo tự động
P9  Wallet/payment/voucher/loyalty/support hoàn chỉnh
P10 Inventory, reporting nâng cao, hardening và release
```

---

# P0 - Chốt domain, role và môi trường

## Mục tiêu

Loại bỏ các mâu thuẫn giữa code, tài liệu và database trước khi viết thêm tính năng.

## Công việc

### P0.1. Chốt role và permission

- [ ] Chọn danh sách role chính thức.
- [ ] Chọn Admin có phải là `OWNER` hay role riêng.
- [ ] Lập bảng quyền cho từng module:
  - [ ] Auth.
  - [ ] Menu.
  - [ ] Floor/table.
  - [ ] Reservation.
  - [ ] POS/order.
  - [ ] KDS.
  - [ ] Wallet/payment.
  - [ ] CDP/report.
  - [ ] Support.
  - [ ] Staff management.
- [ ] Đối chiếu permission matrix với `API_CONTRACT.md`.
- [ ] Đối chiếu role với `users.role` constraint.
- [ ] Đối chiếu role với `RoleApp` TypeScript.
- [ ] Đối chiếu role với JWT custom claims.
- [ ] Đối chiếu role với RLS policy.
- [ ] Đối chiếu role với route và navigation của Staff Dashboard.

### P0.2. Chốt tenant và branch

- [ ] Xác định tenant demo chính.
- [ ] Xác định branch mặc định.
- [ ] Quy định Owner có thể xem toàn tenant hay chỉ branch.
- [ ] Quy định Staff/Manager chỉ được xem branch nào.
- [ ] Quy định Support có branch scope hay tenant scope.
- [ ] Xác định cách customer chọn tenant/chi nhánh khi vào public menu.

### P0.3. Chốt API base URL và môi trường

- [ ] Local API thật.
- [ ] Mock API chỉ dùng cho fallback phát triển.
- [ ] Supabase project development.
- [ ] Supabase project staging nếu có.
- [ ] Redis local hoặc Redis staging.
- [ ] Biến môi trường cho backend.
- [ ] Biến môi trường cho Staff Dashboard.
- [ ] Biến môi trường cho Customer PWA.
- [ ] Kiểm tra không commit secret.

### P0.4. Cập nhật tài liệu

- [ ] Cập nhật `API_CONTRACT.md` nếu role thay đổi.
- [ ] Cập nhật `ERD.md` nếu thêm cột/bảng.
- [ ] Cập nhật `RLS_POLICIES.md` nếu permission thay đổi.
- [ ] Cập nhật error code nếu thêm lỗi nghiệp vụ.
- [ ] Ghi decision vào ADR nếu thay đổi domain lớn.

## Tiêu chí nghiệm thu

- Có một bảng role/permission được thống nhất.
- Không còn role xuất hiện trong tài liệu nhưng không tồn tại trong database/code.
- Có file môi trường mẫu không chứa secret thật.
- Mọi team member biết API thật và mock API khác nhau thế nào.

## Phụ thuộc

Không có. Đây là phase bắt buộc đầu tiên.

---

# P1 - Authentication và session thật

## Mục tiêu

Thay toàn bộ login/token giả bằng authentication thật và dùng chung cho Customer PWA, Staff Dashboard và backend.

## Backend

- [ ] Kiểm tra `POST /auth/register`.
- [ ] Kiểm tra `POST /auth/login`.
- [ ] Kiểm tra `POST /auth/refresh`.
- [ ] Kiểm tra `GET /auth/me`.
- [ ] Đảm bảo login trả đúng JWT claims:
  - [ ] `sub`.
  - [ ] `role_app`.
  - [ ] `tenant_id`.
  - [ ] `branch_id`.
- [ ] Đảm bảo tài khoản bị `is_active = false` không lấy được role hợp lệ.
- [ ] Kiểm tra Supabase Auth hook chạy đúng sau login và refresh.
- [ ] Chuẩn hóa lỗi:
  - [ ] Sai tài khoản/mật khẩu.
  - [ ] Token hết hạn.
  - [ ] Tài khoản bị khóa.
  - [ ] Tài khoản chưa có profile.
  - [ ] Role không hợp lệ.
- [ ] Không cho Customer đăng ký tự gán role Owner/Staff.
- [ ] Không để service role key đi qua response hoặc frontend.

## Customer PWA

- [ ] Tạo auth client/server boundary phù hợp với Next.js.
- [ ] Tạo form đăng ký customer.
- [ ] Tạo form đăng nhập customer.
- [ ] Lưu session an toàn.
- [ ] Xử lý refresh token.
- [ ] Tạo logout.
- [ ] Tạo `useCurrentUser` hoặc auth provider.
- [ ] Bỏ việc tự tạo cookie `header.payload.signature`.
- [ ] Bỏ redirect mặc định từ `/` về `/login`.
- [ ] Redirect đến login khi khách thực hiện hành động yêu cầu account.
- [ ] Sau login quay lại đúng trang trước đó.

## Staff Dashboard

- [ ] Tạo route login riêng.
- [ ] Xóa user Owner mặc định trong `authStore`.
- [ ] Xóa `mock-token`.
- [ ] Login qua API/Supabase thật.
- [ ] Lưu access token và refresh session.
- [ ] Gọi `/auth/me` khi app khởi động.
- [ ] Logout.
- [ ] Redirect user chưa đăng nhập về `/login`.
- [ ] Redirect user đã đăng nhập đến dashboard phù hợp.
- [ ] Hiển thị tên, role, branch thật.
- [ ] Không cho đổi role bằng `switchUser` trong production build.

## Kiểm thử

- [ ] Customer đăng ký và đăng nhập được.
- [ ] Staff đăng nhập được.
- [ ] Owner đăng nhập được.
- [ ] Token refresh hoạt động.
- [ ] Logout làm mất quyền truy cập.
- [ ] User bị deactivate không thể đăng nhập phiên mới.
- [ ] Customer không thể gọi API Staff.
- [ ] Staff không thể gọi API Owner.

## Tiêu chí nghiệm thu

Không còn token mock, user mock hoặc role mock trên luồng chính. Một tài khoản thật đăng nhập được từ frontend, backend đọc đúng `role_app`, tenant và branch.

## Phụ thuộc

P0.

---

# P2 - Tenant, RLS và permission matrix

## Mục tiêu

Đảm bảo phân quyền đúng ở cả ba tầng: frontend route, NestJS guard và Postgres RLS.

## Công việc backend

- [ ] Review toàn bộ `@Roles()` trong controller.
- [ ] Kiểm tra controller nào thiếu `SupabaseAuthGuard`.
- [ ] Kiểm tra `TenantGuard` hoạt động trên mọi route private.
- [ ] Kiểm tra `RolesGuard` không tự động cho role ngoài permission matrix.
- [ ] Kiểm tra Owner có được phép truy cập đúng module.
- [ ] Kiểm tra Staff chỉ thấy dữ liệu branch của mình.
- [ ] Kiểm tra Support chỉ thấy dữ liệu cần thiết.
- [ ] Kiểm tra Customer chỉ đọc được profile/order của chính mình.
- [ ] Kiểm tra các policy có nhắc role không tồn tại như `MANAGER`.
- [ ] Kiểm tra các policy `FOR INSERT`, `FOR UPDATE`, `FOR SELECT`, `FOR DELETE` riêng biệt.
- [ ] Kiểm tra restrictive tenant boundary trên toàn bộ bảng tenant-scoped.
- [ ] Kiểm tra các function `SECURITY DEFINER` có `SET search_path = public`.
- [ ] Kiểm tra financial mutation không bị client tự ghi trực tiếp.

## Công việc frontend

- [ ] Tạo route permission map dùng chung.
- [ ] Không chỉ ẩn menu; route cũng phải bị chặn.
- [ ] Hiển thị màn hình 403 riêng.
- [ ] Hiển thị màn hình 401 riêng.
- [ ] Không tin role trong localStorage nếu chưa xác minh token.
- [ ] Disable thao tác không được phép.
- [ ] Hiển thị branch đang hoạt động.

## Kiểm thử đa tenant

- [ ] Owner tenant A không đọc được floor tenant B.
- [ ] Staff branch A không đọc order branch B.
- [ ] Customer tenant A không đọc product tenant B.
- [ ] Customer không đọc wallet customer khác.
- [ ] Support không thể tự đổi role.
- [ ] Staff không thể sửa giá món.
- [ ] Staff không thể sửa layout bàn.
- [ ] Owner tenant A không cập nhật bàn tenant B.

## Tiêu chí nghiệm thu

Cùng một request bị chặn đúng ở frontend, backend và database khi actor không có quyền. Test không chỉ kiểm tra UI.

## Phụ thuộc

P0, P1.

---

# P3 - Public storefront và menu thật

## Mục tiêu

Cho khách vãng lai xem sản phẩm như một website F&B thực tế, nhưng chỉ cho account đã đăng nhập tạo giỏ hàng/order.

## Backend/API

Có hai hướng triển khai, cần chọn một:

### Hướng A: Public catalog riêng

- [ ] Tạo endpoint public cho branch/tenant public.
- [ ] Chỉ trả category active và product active.
- [ ] Không trả dữ liệu nội bộ như cost, audit hoặc metadata nhạy cảm.
- [ ] Thêm cache nếu menu đọc nhiều.

### Hướng B: Cho phép role public/anon đọc menu

- [ ] Điều chỉnh guard cho catalog.
- [ ] Tạo RLS policy an toàn cho dữ liệu public.
- [ ] Không mở quyền ghi cho anon.
- [ ] Kiểm tra tenant được resolve rõ ràng qua subdomain/branch id.

Đề xuất dùng Hướng A để tránh nới rộng RLS tổng quát.

## Customer PWA

- [ ] Trang chủ public.
- [ ] Header/navigation public.
- [ ] Chọn chi nhánh.
- [ ] Hiển thị giờ mở cửa.
- [ ] Hiển thị địa chỉ và thông tin liên hệ.
- [ ] Hiển thị danh mục.
- [ ] Hiển thị món active.
- [ ] Hiển thị giá.
- [ ] Hiển thị ảnh món.
- [ ] Hiển thị mô tả.
- [ ] Hiển thị trạng thái hết món.
- [ ] Tìm kiếm món.
- [ ] Lọc theo danh mục.
- [ ] Xem chi tiết món.
- [ ] Chọn modifier.
- [ ] Hiển thị CTA thêm vào giỏ.
- [ ] Nếu chưa login, mở login hoặc yêu cầu login khi thêm món.
- [ ] Nếu đã login, thêm món vào cart.
- [ ] Cart giữ đúng tenant/branch.

## Menu management cho Owner

- [ ] Load danh mục thật.
- [ ] Tạo danh mục.
- [ ] Sửa danh mục.
- [ ] Ẩn/xóa danh mục theo rule.
- [ ] Tạo món.
- [ ] Sửa giá và tên.
- [ ] Bật/tắt món.
- [ ] Cấu hình kitchen station.
- [ ] Cấu hình modifier.
- [ ] Upload ảnh qua Supabase Storage hoặc storage service thật.
- [ ] Preview menu giống customer.

## Tiêu chí nghiệm thu

Khách chưa đăng nhập mở được trang chủ và menu thật. Customer không thể tạo order nếu chưa có session hợp lệ. Owner sửa món trên dashboard và customer thấy dữ liệu mới.

## Phụ thuộc

P1, P2.

---

# P4 - Reservation và Customer Order

## Mục tiêu

Hoàn thiện luồng từ chọn bàn đến tạo order và thanh toán qua backend thật.

## Reservation

- [ ] Customer chọn branch.
- [ ] Customer xem danh sách floor.
- [ ] Customer xem table từ API.
- [ ] Customer nhìn thấy vị trí thật của bàn.
- [ ] Chỉ cho chọn bàn `AVAILABLE`.
- [ ] Gọi `POST /reservations/lock`.
- [ ] Hiển thị timer từ `expires_at` của server.
- [ ] Không dùng thời gian lock tự tạo chỉ ở client.
- [ ] Hiển thị QR cọc.
- [ ] Gọi payment mock webhook đúng secret ở môi trường test.
- [ ] Nhận kết quả payment.
- [ ] Chuyển bàn sang `RESERVED` khi backend xác nhận.
- [ ] Hủy lock đúng owner token.
- [ ] Tự xử lý timeout.
- [ ] Xử lý hai customer cùng khóa một bàn.
- [ ] Không cho customer tự đổi status bàn bằng client state.

## Cart

- [ ] Cart dùng product id thật.
- [ ] Cart lưu quantity.
- [ ] Cart lưu modifier.
- [ ] Cart kiểm tra price từ server.
- [ ] Cart kiểm tra product còn active.
- [ ] Không tin total do client gửi.
- [ ] Có update quantity.
- [ ] Có remove item.
- [ ] Có ghi chú order.
- [ ] Có xử lý cart hết món.

## Order

- [ ] Quyết định order tạo lúc customer checkout hay lúc staff check-in.
- [ ] Với dine-in, đảm bảo bàn có order mở.
- [ ] Với group-order, dùng đúng Redis session.
- [ ] Gọi API thêm item.
- [ ] Tính tổng ở backend.
- [ ] Gắn customer id.
- [ ] Gắn branch id.
- [ ] Gắn table id nếu dine-in.
- [ ] Tạo order code.
- [ ] Ghi order items.
- [ ] Gửi order vào trạng thái phù hợp.
- [ ] Gọi submit kitchen.
- [ ] Hiển thị order detail.
- [ ] Hiển thị order history.

## Checkout

- [ ] VietQR đi qua API.
- [ ] Wallet đi qua service/RPC atomic.
- [ ] Coffee Pass đi qua API.
- [ ] Không trừ ví trong Zustand.
- [ ] Không tự set order thành completed ở frontend.
- [ ] Idempotency cho payment.
- [ ] Hiển thị payment pending/success/failed.
- [ ] Có retry an toàn.
- [ ] Có receipt/order summary.

## Tiêu chí nghiệm thu

Customer có thể chọn bàn, tạo order thật, thanh toán mock qua backend, xem trạng thái order và không thể gian lận giá hoặc số dư bằng cách sửa state frontend.

## Phụ thuộc

P1, P2, P3. Redis phải chạy cho reservation/group-order.

---

# P5 - Staff Dashboard theo role

## Mục tiêu

Biến Staff Dashboard từ giao diện mock thành ứng dụng vận hành thật theo từng role.

## Khung dùng chung

- [ ] Login page.
- [ ] Session provider.
- [ ] API client tự gắn Bearer token.
- [ ] Refresh token interceptor.
- [ ] Logout.
- [ ] Current user context.
- [ ] Branch selector nếu role được phép.
- [ ] Permission guard.
- [ ] 401/403/error page.
- [ ] Loading/empty/error state.
- [ ] Toast theo API error code.
- [ ] Audit-friendly UI cho thao tác nhạy cảm.

## Owner/Admin

- [ ] Dashboard tổng quan.
- [ ] Doanh thu.
- [ ] Số order.
- [ ] Tỷ lệ bàn đang dùng.
- [ ] Top món.
- [ ] Menu management.
- [ ] Staff management.
- [ ] Floor Editor.
- [ ] Customer/CDP.
- [ ] Support escalation.
- [ ] Cấu hình chi nhánh.

## Manager

- [ ] Dashboard chi nhánh.
- [ ] Live floor map.
- [ ] POS.
- [ ] Order queue.
- [ ] Ca làm.
- [ ] Báo cáo ca.
- [ ] Xem tồn kho nếu module có.
- [ ] Không được thay đổi owner hoặc tenant config.

## Staff

- [ ] Live floor map.
- [ ] Check-in bàn.
- [ ] Tạo order.
- [ ] Thêm/sửa món.
- [ ] Gửi bếp.
- [ ] Cập nhật trạng thái phục vụ.
- [ ] Thu tiền theo quyền.
- [ ] Đổi bàn sang cleaning/available theo state machine.

## Kitchen/Bar

- [ ] KDS theo station.
- [ ] Ticket mới realtime.
- [ ] Lọc `BAR`/`KITCHEN`.
- [ ] Chuyển `QUEUED` -> `PREPARING`.
- [ ] Chuyển `PREPARING` -> `READY`.
- [ ] Đánh dấu đã phục vụ.
- [ ] Âm thanh/thông báo ticket mới nếu cần.
- [ ] Reconnect và đồng bộ lại queue.

## Support

- [ ] Unmatched payment queue.
- [ ] Suggest customer match.
- [ ] Maker propose.
- [ ] Checker approve.
- [ ] Chặn self-approval.
- [ ] Ticket CSAT.
- [ ] Ticket urgent.
- [ ] Cấp voucher.
- [ ] Merge customer profile.
- [ ] Hiển thị audit trail.

## Tiêu chí nghiệm thu

Mỗi role đăng nhập vào dashboard và chỉ thấy đúng navigation, route, API action và dữ liệu được phép. Không dùng nút switch role để mô phỏng trong luồng thật.

## Phụ thuộc

P1, P2, P4.

---

# P6 - Floor Editor kéo thả và đồng bộ customer

## Mục tiêu

Owner/Admin có thể thiết kế layout bàn, lưu vào database và customer nhìn thấy đúng layout đó.

## Backend

- [ ] Kiểm tra `GET /floors?branch_id=`.
- [ ] Kiểm tra `GET /floors/:id/tables`.
- [ ] Kiểm tra `POST /floors`.
- [ ] Kiểm tra `POST /tables`.
- [ ] Kiểm tra `PATCH /tables/:id`.
- [ ] Validate `pos_x`, `pos_y` không âm nếu business rule yêu cầu.
- [ ] Validate width/height trong giới hạn hợp lý.
- [ ] Validate shape hợp lệ.
- [ ] Không cho update `floor_id` qua patch hiện tại.
- [ ] Chặn update bàn thuộc tenant khác bằng RLS.
- [ ] Ghi `updated_at`.
- [ ] Phát realtime khi status thay đổi, không nhất thiết phát khi layout thay đổi nếu chưa cần.
- [ ] Thêm endpoint batch update nếu kéo nhiều bàn rồi lưu một lần.

## Staff Dashboard Floor Editor

- [ ] Tạo route riêng chỉ cho Owner/Admin.
- [ ] Load danh sách floor.
- [ ] Chọn floor.
- [ ] Load tables từ API.
- [ ] Render theo tọa độ thật.
- [ ] Kéo bàn bằng pointer events.
- [ ] Không nhầm thao tác pan canvas với kéo bàn.
- [ ] Chọn bàn.
- [ ] Hiển thị panel thuộc tính.
- [ ] Sửa tên.
- [ ] Sửa capacity.
- [ ] Sửa width/height.
- [ ] Đổi circle/rectangle/square.
- [ ] Thêm bàn.
- [ ] Xóa hoặc deactivate bàn theo rule.
- [ ] Undo/redo nếu có thể.
- [ ] Nút Save.
- [ ] Nút Reset thay đổi chưa lưu.
- [ ] Hiển thị dirty state.
- [ ] Hiển thị lỗi update từng bàn.
- [ ] Ngăn hai bàn chồng nhau nếu business yêu cầu.
- [ ] Zoom/pan ổn định.
- [ ] Responsive tối thiểu cho tablet.

## Customer Floor Map

- [ ] Xóa `INITIAL_TABLES` hard-code.
- [ ] Load floor thật.
- [ ] Load table thật.
- [ ] Dùng `pos_x`, `pos_y`, `width`, `height`, `shape`.
- [ ] Chỉ hiển thị hành động đặt cho bàn available.
- [ ] Realtime status.
- [ ] Không cho customer chỉnh vị trí.
- [ ] Có fallback empty/loading/error.
- [ ] Bảo đảm canvas có kích thước ổn định.

## Tiêu chí nghiệm thu

Owner kéo bàn từ vị trí A sang B, bấm lưu, reload lại vẫn ở B. Customer mở cùng floor thấy B. Khi bàn đổi status, cả staff và customer thấy status mới realtime.

## Phụ thuộc

P2, P5. API floor/table phải hoạt động với dữ liệu thật.

---

# P7 - POS, KDS và realtime vận hành

## Mục tiêu

Nhân viên có thể vận hành toàn bộ quy trình tại quán từ check-in đến thanh toán.

## POS

- [ ] Chọn bàn.
- [ ] Check-in bàn.
- [ ] Tạo order.
- [ ] Chọn category.
- [ ] Chọn product.
- [ ] Chọn modifier.
- [ ] Sửa quantity.
- [ ] Ghi chú.
- [ ] Gửi bếp.
- [ ] Thêm món phát sinh.
- [ ] Xem trạng thái món.
- [ ] Đổi bàn nếu nghiệp vụ cho phép.
- [ ] Gộp bàn nếu nghiệp vụ cho phép.
- [ ] Tách bill.
- [ ] Áp voucher.
- [ ] Thanh toán.
- [ ] In hoặc xuất receipt.
- [ ] Hoàn tất và trả bàn về trạng thái phù hợp.

## KDS

- [ ] Tách ticket theo kitchen station.
- [ ] Hiển thị thời gian chờ.
- [ ] Hiển thị bàn/order code.
- [ ] Hiển thị modifier và ghi chú.
- [ ] Chuyển trạng thái từng item.
- [ ] Realtime ticket mới.
- [ ] Reconnect tự fetch queue.
- [ ] Không tạo ticket trùng khi reconnect.
- [ ] Xử lý ticket bị hủy.
- [ ] Lưu audit người thao tác nếu cần.

## Realtime

- [ ] Chuẩn hóa event name.
- [ ] Chuẩn hóa room theo tenant/branch/table/session.
- [ ] Subscribe khi vào màn hình.
- [ ] Unsubscribe khi rời màn hình.
- [ ] Reconnect.
- [ ] Backfill dữ liệu sau reconnect.
- [ ] Không tin event cũ hơn state hiện tại.
- [ ] Không lộ event giữa tenant.

## Tiêu chí nghiệm thu

Hai thiết bị mở cùng một branch: staff đổi trạng thái bàn hoặc KDS item ở thiết bị A thì thiết bị B cập nhật đúng, không cần F5 và không nhân bản dữ liệu.

## Phụ thuộc

P4, P5, P6, Redis và realtime gateway.

---

# P8 - Seed dữ liệu demo tự động

## Mục tiêu

Tạo môi trường demo có thể dựng lại bằng một lệnh, không phải tạo user thủ công trong Supabase Dashboard.

## Tài khoản cần tạo

Đề xuất dataset:

- [ ] 1 Owner/Admin.
- [ ] 10 nhân viên.
- [ ] 10 customer.
- [ ] Phân bổ rõ role/station của nhân viên.
- [ ] Email test có quy tắc thống nhất.
- [ ] Password test lấy từ environment variable.
- [ ] Không commit password thật.
- [ ] In credential sau khi seed ở local hoặc ghi vào file được gitignore.

## Script seed

- [ ] Tạo `backend/api/scripts/seed-demo.ts` hoặc package seed riêng.
- [ ] Dùng Supabase Admin API để tạo Auth user.
- [ ] Tìm user đã tồn tại trước khi tạo.
- [ ] Tạo profile `users` cho staff.
- [ ] Tạo profile `customers` cho customer.
- [ ] Tạo wallet cho customer.
- [ ] Gắn tenant và branch.
- [ ] Gán role đúng.
- [ ] Gán email/phone duy nhất.
- [ ] Upsert dữ liệu business.
- [ ] Không dùng service role trong frontend.
- [ ] Có transaction/rollback logic ở mức script khi có lỗi.
- [ ] Có chế độ `reset-demo` chỉ dùng local/staging.
- [ ] Có chế độ `seed-demo` idempotent.
- [ ] Log tổng kết số record tạo/cập nhật/bỏ qua.

## Dữ liệu business

- [ ] 1 tenant.
- [ ] Ít nhất 1 branch.
- [ ] 2-3 floor.
- [ ] 20-30 table với tọa độ khác nhau.
- [ ] 5-8 category.
- [ ] 30-50 product.
- [ ] Modifier groups/options.
- [ ] Một số món inactive.
- [ ] Một số bàn occupied/reserved/cleaning để demo.
- [ ] Coffee Pass plans.
- [ ] Voucher.
- [ ] Sample orders.
- [ ] Sample order items.
- [ ] Payment transactions.
- [ ] Wallet transactions.
- [ ] Support tickets.
- [ ] Audit logs.

## Kiểm tra sau seed

- [ ] Login Owner.
- [ ] Login Staff.
- [ ] Login Customer.
- [ ] Đọc JWT claims.
- [ ] Kiểm tra customer chỉ thấy menu active.
- [ ] Kiểm tra Staff thấy branch của mình.
- [ ] Kiểm tra Owner thấy staff.
- [ ] Kiểm tra order mẫu.
- [ ] Kiểm tra wallet.
- [ ] Kiểm tra floor layout.

## Tiêu chí nghiệm thu

Một developer mới có thể tạo database và dữ liệu demo bằng tài liệu + một lệnh seed, không cần sửa UUID thủ công trong `seed.sql`.

## Phụ thuộc

P0, P1, P2. Nên chạy sau khi schema và auth contract ổn định.

---

# P9 - Wallet, payment, voucher, loyalty và support

## Wallet

- [ ] GET balance thật.
- [ ] GET transaction history thật.
- [ ] Topup mock qua backend.
- [ ] Idempotency topup.
- [ ] Không cho client sửa balance.
- [ ] Atomic deduction.
- [ ] Promo balance được trừ trước main balance nếu đúng business rule.
- [ ] Audit mỗi mutation.
- [ ] Lock wallet row khi trừ tiền.

## Payment

- [ ] Chuẩn hóa payment state.
- [ ] Mock webhook có secret.
- [ ] Rate limit webhook.
- [ ] Idempotency database.
- [ ] Unmatched transaction.
- [ ] Retry/reconciliation.
- [ ] Refund flow.
- [ ] Maker-checker cho refund nếu cần.
- [ ] Không đánh dấu paid chỉ dựa trên frontend callback.

## Voucher và loyalty

- [ ] Tạo voucher.
- [ ] Điều kiện áp dụng.
- [ ] Thời hạn.
- [ ] Giới hạn lượt dùng.
- [ ] Không dùng chung.
- [ ] Audit redeem.
- [ ] Tích điểm khi order completed.
- [ ] Hủy/hoàn order phải xử lý điểm.
- [ ] Hiển thị hạng thành viên.

## Coffee Pass

- [ ] Danh sách plan.
- [ ] Mua plan qua backend.
- [ ] Trừ ví atomic.
- [ ] Tạo subscription.
- [ ] TOTP xoay định kỳ.
- [ ] Staff redeem.
- [ ] Chống redeem hai lần.
- [ ] Hết hạn subscription.

## Support/CDP

- [ ] Customer gửi CSAT.
- [ ] Điểm thấp tạo urgent ticket.
- [ ] Support xem queue.
- [ ] Suggest customer match.
- [ ] Maker-checker.
- [ ] Chặn self-approval.
- [ ] Merge profile an toàn.
- [ ] Không mất wallet khi merge.
- [ ] Phát voucher từ ticket nếu được phép.
- [ ] Audit thao tác support.

## Tiêu chí nghiệm thu

Mọi thao tác tài chính có trạng thái, idempotency, audit và kiểm soát actor. Không có thao tác nào chỉ thay đổi số dư ở browser.

## Phụ thuộc

P4, P5, P7, P8.

---

# P10 - Inventory, báo cáo nâng cao và release

## Inventory

- [ ] Ingredient master data.
- [ ] Unit of measure.
- [ ] Recipe/BOM cho product.
- [ ] Stock in.
- [ ] Stock out.
- [ ] Stock adjustment.
- [ ] Low stock alert.
- [ ] Trừ tồn khi order completed hoặc khi submit kitchen theo business rule.
- [ ] Không cho bán món khi nguyên liệu không đủ nếu có rule.
- [ ] Audit điều chỉnh tồn.

## Báo cáo

- [ ] Doanh thu theo ngày/tuần/tháng.
- [ ] Doanh thu theo branch.
- [ ] Doanh thu theo payment method.
- [ ] Top product.
- [ ] Tỷ lệ hủy.
- [ ] Average order value.
- [ ] Table utilization.
- [ ] Peak hour.
- [ ] Customer retention.
- [ ] Export CSV/PDF nếu cần.

## UX và vận hành

- [ ] Responsive mobile cho customer.
- [ ] Responsive tablet cho POS/KDS.
- [ ] Keyboard-friendly POS.
- [ ] Loading state.
- [ ] Empty state.
- [ ] Error state.
- [ ] Offline/retry strategy phù hợp.
- [ ] Accessibility cơ bản.
- [ ] Localization tiền tệ và thời gian.
- [ ] Confirm action nguy hiểm.
- [ ] Không hiển thị thông tin nhạy cảm.

## Security

- [ ] CORS whitelist.
- [ ] Rate limit login.
- [ ] Rate limit webhook.
- [ ] Input validation.
- [ ] SQL/RLS review.
- [ ] Secret scanning.
- [ ] Không log token/password.
- [ ] Audit log.
- [ ] Session expiration.
- [ ] Account deactivation.
- [ ] Backup database.
- [ ] Restore drill.
- [ ] Error monitoring.

## Testing

### Unit/API

- [ ] Auth.
- [ ] Role guard.
- [ ] Tenant isolation.
- [ ] Reservation lock.
- [ ] Duplicate webhook.
- [ ] Wallet deduction.
- [ ] Group order rollback.
- [ ] Order state machine.
- [ ] KDS state.
- [ ] Maker-checker.
- [ ] Customer merge.

### Integration/E2E

- [ ] Customer browse -> login -> cart -> order.
- [ ] Customer reserve -> pay deposit.
- [ ] Staff check-in -> order -> submit kitchen.
- [ ] KDS prepare -> ready -> served.
- [ ] Customer pay order.
- [ ] Owner edit menu.
- [ ] Owner edit floor.
- [ ] Customer sees edited floor.
- [ ] Support resolves unmatched payment.
- [ ] Two users lock one table.
- [ ] Two users redeem one Coffee Pass.

### Release checklist

- [ ] Build backend.
- [ ] Build Staff Dashboard.
- [ ] Build Customer PWA.
- [ ] Run lint.
- [ ] Run unit tests.
- [ ] Run API tests.
- [ ] Run database migrations on staging.
- [ ] Run seed staging.
- [ ] Verify environment variables.
- [ ] Verify CORS.
- [ ] Verify realtime.
- [ ] Verify Redis.
- [ ] Verify logs/monitoring.
- [ ] Smoke test critical user journeys.

## Tiêu chí nghiệm thu

Có thể deploy staging, seed dữ liệu, đăng nhập từng role, chạy order thật từ customer/staff đến KDS/payment, và kiểm tra tenant isolation trước khi demo hoặc production.

## Phụ thuộc

Tất cả phase trước.

---

# 6. Checklist MVP bắt buộc trước khi demo

Nếu cần rút gọn để có một bản demo chạy được, phải hoàn thành tối thiểu:

- [ ] P0: Chốt role và môi trường.
- [ ] P1: Auth thật.
- [ ] P2: Guard/RLS cơ bản.
- [ ] P3: Public menu từ API.
- [ ] P4: Reservation và order thật.
- [ ] P5: Staff login + POS tối thiểu.
- [ ] P6: Floor Editor và customer map dùng layout thật.
- [ ] P7: KDS tối thiểu.
- [ ] P8: Seed tự động.
- [ ] Test hai customer tranh cùng một bàn.
- [ ] Test customer không gọi được API staff.
- [ ] Test staff không sửa được menu/layout nếu không có quyền.
- [ ] Test payment không thể tự đánh dấu completed từ frontend.

# 7. Những việc không nên làm sớm

- [ ] Không làm UI marketing trước khi order thật chạy.
- [ ] Không thêm nhiều role mới trước khi chốt permission matrix.
- [ ] Không tạo 21 tài khoản bằng tay nếu đã xác định cần seed lặp lại.
- [ ] Không nối frontend trực tiếp vào bảng tài chính Supabase.
- [ ] Không dùng local Zustand làm nguồn sự thật cho order/payment.
- [ ] Không xây Floor Editor riêng mà bỏ qua API `PATCH /tables/:id`.
- [ ] Không chỉ ẩn menu để gọi là phân quyền.
- [ ] Không mở public toàn bộ bảng products/categories qua RLS mà không giới hạn tenant/branch.
- [ ] Không gọi seed script bằng service role từ browser.
- [ ] Không đánh dấu feature là done chỉ vì backend đã có endpoint nếu frontend chưa gọi được endpoint thật.

# 8. Definition of Done chung

Một feature chỉ được coi là hoàn thành khi:

- [ ] Có API hoặc contract rõ ràng.
- [ ] Có validation backend.
- [ ] Có permission và tenant scope.
- [ ] Có UI loading/error/empty state.
- [ ] Có xử lý session/refresh nếu cần.
- [ ] Có realtime/reconnect nếu feature yêu cầu.
- [ ] Có test thành công và test lỗi chính.
- [ ] Không dùng mock data trong happy path production.
- [ ] Không làm lộ secret hoặc dữ liệu tenant khác.
- [ ] Có cập nhật tài liệu khi thay đổi contract.
- [ ] Có tiêu chí nghiệm thu cụ thể.

# 9. Lệnh kiểm tra tham khảo

## Backend

```powershell
cd backend/api
npm run build
npm run lint
npm test
```

## Staff Dashboard

```powershell
cd apps/staff-dashboard
npm run build
npm run lint
```

## Customer PWA

```powershell
cd apps/customer-pwa
npm run build
```

## Chạy local hiện tại

```powershell
cd apps/staff-dashboard
node mock-server.js
```

```powershell
cd apps/staff-dashboard
npm run dev
```

```powershell
cd apps/customer-pwa
npm run dev
```

Mock server chỉ dùng để kiểm tra UI tạm thời. Trước khi nghiệm thu các luồng nghiệp vụ, phải chạy backend NestJS và Supabase/Redis thật.
