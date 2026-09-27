# 📋 Plan Hoàn Thiện Logic — 26/09/2026

> **Nguyên tắc:** Không thay đổi logic hiện tại đã hoạt động đúng. Giữ nguyên màu sắc & design system hiện có (`#543310`, `#D67D3E`, `#FED8B1`, `#E8DED5`, `#FAF7F3`, `#237A57`, `#B42318`). Chỉ bổ sung logic thiếu hoặc loại bỏ phần "làm cảnh".

---

## 🔴 MỨC ĐỘ 1 — CRITICAL (Làm trước, ảnh hưởng trải nghiệm chính)

### Mục 7 – Bỏ hết các chức năng làm cảnh (Sidebar, Header, Dashboard)
> **Lý do ưu tiên cao nhất:** Gây nhầm lẫn cho người dùng/demo ngay từ cái nhìn đầu tiên. Không cần code logic mới — chỉ cần xóa/ẩn.

**Phạm vi: `staff-dashboard` (FE)**

- [x] **7.1** `Sidebar.tsx` — Xóa nút **"Cài đặt hệ thống"** (dòng 86–91). Nút này không dẫn đến đâu, chỉ nằm tĩnh.
- [x] **7.2** `Header.tsx` — Xóa **icon đồng hồ (Clock)** kèm badge đỏ (dòng 21–24). Đây là notification giả, chưa có hệ thống thông báo.
- [x] **7.3** `Header.tsx` — Xóa **icon Plus** bên cạnh avatar (dòng 38). Không có chức năng.
- [x] **7.4** `Header.tsx` — Xóa **thanh Search** (dòng 11–18). Ô tìm kiếm không kết nối bất kỳ logic lọc nào.
- [x] **7.5** `MetricStrip.tsx` — Kiểm tra card **"Doanh thu chi nhánh"** — dữ liệu dynamic từ API, hiển thị theo store (`revenue`, `ordersCount`, `occupiedTables`, `averageOrderValue`). ✅ Đã xác nhận không có data cứng.
- [x] **7.6** `BranchDateFilter.tsx` — Dropdown Branch đã có logic fetch `apiClient.get('/branches')` lấy danh sách chi nhánh thực tế từ backend. ✅ Đã xác nhận hoạt động đúng.

---

### Mục 9 – Xóa icon Giỏ hàng ngay trang chính (Customer PWA)
> **Lý do ưu tiên:** Giỏ hàng hiển thị "0" cứng trên header — gây hiểu lầm cho khách hàng.

**Phạm vi: `customer-pwa` (FE)**

- [x] **9.1** `PublicHeader.tsx` — Xóa `<Link href="/cart">` block (dòng 55–61) chứa icon `ShoppingBag` với badge count "0" hardcoded. Chỉ xóa phần cart icon, giữ nguyên phần avatar/profile.

---

### Mục 8 – Xóa tag Khuyến mãi (Promotions) nếu không phát triển
> **Lý do ưu tiên:** Link "Khuyến mãi" trên nav dẫn đến trang `/promotions` không tồn tại → 404 page.

**Phạm vi: `customer-pwa` (FE)**

- [x] **8.1** `PublicHeader.tsx` — Xóa `<Link href="/promotions">` (dòng 43–48) khỏi desktop nav.
- [x] **8.2** `ProductCard.tsx` — Kiểm tra nếu có tag khuyến mãi (ví dụ `tags?.includes('sale')` hoặc `tags?.includes('discount')`) → xóa phần render badge đó. *(Xác nhận chỉ có `new` và `popular` — không có badge sale rác).*
- [x] **8.3** Rà soát `FeaturedMenuSection.tsx` — Kiểm tra nếu có badge/label "giảm giá" → xóa. *(Xác nhận không có badge rác).*

---

## 🟠 MỨC ĐỘ 2 — HIGH (Logic chính cần bổ sung)

### Mục 1 – Nhấn "Thêm" khi chưa đăng nhập → Chuyển hướng Login
> **Lý do:** Khách vãng lai bấm "Thêm" vào giỏ hàng trên trang thực đơn nhưng không nhận được phản hồi gì → trải nghiệm tệ.

**Phạm vi: `customer-pwa` (FE) + `packages/utils` (FE)**

- [x] **1.1** `api-client.ts` — Hiện đã `dispatch('api:unauthorized')` khi nhận 401. ✅ Đã kết nối `window.addEventListener('api:unauthorized', ...)` trong `AuthProvider.tsx` (mở `LoginRequiredModal`) và `StaffAuthProvider.tsx` (redirect `/login`).
- [x] **1.2** `ProductCard.tsx` — Hiện đã có `useAuthGuard()` + `requireAuth()` ở nút "Thêm" (dòng 23–28). ✅ Xác nhận hoạt động đúng.
- [x] **1.3** `FeaturedMenuSection.tsx` — Nút "Thêm" (dòng 101–104) ✅ Đã bọc `requireAuth()` chuyển hướng mượt mà sang `/menu` để đặt món.
- [x] **1.4** Kiểm tra trang `/menu/page.tsx` — ✅ Xác nhận nút "Thêm vào giỏ" trên trang menu chính cũng sử dụng `requireAuth()`.

---

### Mục 10 / Feature – Vô hiệu hóa nhân viên & Chặn đăng nhập
> **Lý do:** Đây là nghiệp vụ bảo mật quan trọng — owner vô hiệu hóa nhân viên nhưng nhân viên vẫn login được.

**Phạm vi: `staff-dashboard` (FE) + `backend/api` (BE)**

#### FE – Staff Dashboard

- [x] **10.1** `StaffTable.tsx` — Thay nút **"Vô hiệu hóa"** (`ShieldOff` icon) thành **Toggle Switch** (công tắc bật/tắt `active`). ✅ Đã cập nhật dòng mờ `opacity-50`, hiển thị trạng thái chuẩn, giữ nhân viên trong bảng để bật lại.
- [x] **10.2** `StaffManagement.tsx` — ✅ Đã kết nối `toggleStaff` và truyền `onToggleStaff` xuống `StaffTable`, giữ `DeactivateConfirmModal` cảnh báo trước khi vô hiệu hóa OWNER cuối cùng.
- [x] **10.3** `Login.tsx` (Staff Dashboard) — Bắt lỗi chi tiết ở `catch` block: ✅ Bắt mã `ERR_1001_UNAUTHORIZED` hiển thị thông báo đỏ: *"Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ Quản lý!"*.

#### BE – Backend API

- [x] **10.4** `POST /auth/login` — Sau khi Supabase Auth xác thực thành công, query bảng `users` bằng `auth_user_id`. ✅ Đã kiểm tra `is_active === false` → throw Exception `ERR_1001_UNAUTHORIZED` + message.
- [x] **10.5** `POST /auth/refresh` — ✅ Đã kiểm tra `is_active` trước khi cấp refresh token mới.
- [x] **10.6** `PATCH /staff/:id` — ✅ Đảm bảo API update đúng cột `is_active` trong bảng `users`.
- [x] **10.7** `PATCH /staff/:id/deactivate` — ✅ Đã xác nhận kiểm tra `ERR_8003_CANNOT_DEACTIVATE_LAST_OWNER` không cho phép vô hiệu hóa OWNER cuối cùng.

---

### Mục 3 – Trang KDS cho Bếp (Kitchen) & Quầy Bar
> **Lý do:** Bếp và Bar cần tách biệt rõ ràng để vận hành song song.

**Phạm vi: `staff-dashboard` (FE) + `backend/api` (BE)**

#### FE – Staff Dashboard

- [x] **3.1** `KDSKitchen.tsx` & `KDSBar.tsx` — Đã tồn tại và truyền đúng `station="KITCHEN"` / `station="BAR"` vào `KDSBoard`. ✅ Route `/kds/kitchen` và `/kds/bar` đã được đăng ký trong `App.tsx`.
- [x] **3.2** `KDSBoard.tsx` — API call đã gửi param `station` (dòng 142). WebSocket `kds_new_ticket` đã filter theo `station` (dòng 177, 180). ✅ Logic FE đã đầy đủ.
- [x] **3.3** `Sidebar.tsx` — Đã có link đến `/kds/kitchen` (Bếp) và `/kds/bar` (Quầy Bar) trong `staffLinks` (dòng 45–46). ✅ Navigation hoạt động mượt mà.

#### BE – Backend API

- [x] **3.4** `GET /orders/kds` — ✅ DTO `KdsOrdersQueryDto` đã hỗ trợ query param `station=KITCHEN|BAR` để lọc order items theo trạm.
- [x] **3.5** WebSocket event `kds_new_ticket` — ✅ Payload chứa field `station` cho từng trạm.

---

## 🟡 MỨC ĐỘ 3 — MEDIUM (Cải thiện UX / tính năng phụ)

### Mục 5 – Tổng tiền mua nguyên liệu chưa có (Dashboard Analytics)
> **Lý do:** Owner muốn xem chi phí nhập kho nhưng Dashboard chưa hiển thị.

**Phạm vi: `staff-dashboard` (FE) + `backend/api` (BE)**

- [x] **5.1** `MetricStrip.tsx` — Thêm **card thứ 5** "Chi phí nguyên liệu" vào grid. ✅ Giữ nguyên thiết kế chuẩn: border `#E8DED5`, font-black `#543310`, icon `Package`.
- [x] **5.2** `analyticsStore.ts` — Thêm field `totalIngredientCost` vào interface `DashboardData`. ✅ Parse từ response field `total_ingredient_cost`.
- [x] **5.3** `Analytics.tsx` — Truyền `totalIngredientCost` xuống `MetricStrip`. ✅ Đã cập nhật.
- [x] **5.4** `GET /reports/dashboard` — ✅ Thêm logic tính tổng chi phí nhập kho từ `inventory_transactions` (`type = 'IN'`) trong `cdp.service.ts`.

---

### Mục 6 – Chỉnh form "Thêm tầng" (FloorEditor)
> **Lý do:** Hiện tại dùng `window.prompt()` — thô sơ, không phù hợp production.

**Phạm vi: `staff-dashboard` (FE)**

- [x] **6.1** `FloorEditor.tsx` — Thay `window.prompt('Nhập tên tầng mới:')` bằng **Modal form** hiện đại:
  - Input "Tên tầng / Khu vực mới".
  - Nút "Hủy" + "Tạo tầng".
  - Rounded corners, border `#E8DED5`, button primary `#D67D3E`.
  - Giữ nguyên logic gọi API `POST /api/v1/floors`.
- [x] **6.2** `FloorEditor.tsx` — Thay thế prompt thô sơ bằng modal chuyên nghiệp. ✅ Đã hoàn thành.

---

### Mục 2 – Chức năng Quên mật khẩu
> **Lý do:** Feature cần thiết cho cả khách hàng và nhân viên.

**Phạm vi: `customer-pwa` + `staff-dashboard` (FE) + `backend/api` (BE)**

#### FE – Customer PWA

- [x] **2.1** Tạo route `/forgot-password/page.tsx` — Form nhập email, gọi `POST /auth/forgot-password`. ✅ Design chuẩn `bg-[#FAF7F3]`, card `border-[#E8DED5]`, button `bg-[#543310]`.
- [x] **2.2** Tạo route `/reset-password/page.tsx` — Form nhập mã OTP/token + mật khẩu mới, gọi `POST /auth/reset-password`. ✅ Design chuẩn.
- [x] **2.3** `login/page.tsx` — Thêm link **"Quên mật khẩu?"** dưới form login. ✅ Style `text-[#D67D3E] font-medium hover:underline`.

#### FE – Staff Dashboard

- [x] **2.4** `Login.tsx` — Thêm link **"Quên mật khẩu?"** dưới ô mật khẩu. ✅ Style `text-[var(--color-brand-secondary)]`.

#### BE – Backend API

- [x] **2.5** `POST /auth/forgot-password` — Nhận `{ email }`, gọi `resetPasswordForEmail()` gửi link đặt lại mật khẩu. ✅
- [x] **2.6** `POST /auth/reset-password` — Nhận `{ token, new_password }`, xác thực token → cập nhật mật khẩu trong Supabase Auth. ✅

---

## 🟢 MỨC ĐỘ 4 — LOW (Nice-to-have, làm sau cùng)

### Nâng cấp API Interceptor (Bổ sung từ Mục 1)

- [x] **Bonus 1** `api-client.ts` — Event `api:unauthorized` đã được kết nối lắng nghe 100%:
  - `StaffAuthProvider.tsx` (staff-dashboard) → `window.addEventListener('api:unauthorized', ...)` xóa auth + chuyển `/login`. ✅
  - `AuthProvider.tsx` (customer-pwa) → `window.addEventListener('api:unauthorized', ...)` xóa auth + mở `LoginRequiredModal`. ✅

- [x] **Bonus 2** Kiểm tra tất cả các trang gọi API → ✅ Xác nhận 100% trang trong `customer-pwa` và `staff-dashboard` đều sử dụng `apiClient` từ `@fnb/utils`.

---

## 📌 Tóm tắt thứ tự thực hiện

| STT | Mục   | Mô tả ngắn                           | App             | Độ khó | Ước lượng |
|-----|-------|---------------------------------------|-----------------|--------|-----------|
| 1   | #7    | Xóa chức năng làm cảnh               | staff-dashboard | Dễ     | 30 phút   |
| 2   | #9    | Xóa icon giỏ hàng trang chính        | customer-pwa    | Dễ     | 10 phút   |
| 3   | #8    | Xóa tag Khuyến mãi / link Promotions | customer-pwa    | Dễ     | 15 phút   |
| 4   | #1    | Auth guard nút "Thêm" + 401 handler  | customer-pwa    | TB     | 45 phút   |
| 5   | #10   | Vô hiệu hóa NV + chặn login (FE)    | staff-dashboard | TB     | 1–2 giờ   |
| 6   | #10   | Vô hiệu hóa NV + chặn login (BE)    | backend/api     | TB     | 1–2 giờ   |
| 7   | #3    | KDS Bếp/Bar — xác nhận + BE filter   | cả FE & BE      | TB     | 1 giờ     |
| 8   | #5    | Card tổng chi phí nguyên liệu        | cả FE & BE      | TB     | 1–2 giờ   |
| 9   | #6    | Chỉnh form "Thêm tầng" → Modal       | staff-dashboard | TB     | 1 giờ     |
| 10  | #2    | Quên mật khẩu (full flow)            | cả FE & BE      | Khó    | 3–4 giờ   |

---

> **Ghi chú:** Khi hoàn thành mỗi mục, tick `[x]` vào checkbox tương ứng. Nếu mục nào cần điều chỉnh, ghi note bên dưới checkbox đó.
