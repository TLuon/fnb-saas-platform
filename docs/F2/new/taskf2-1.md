# F2 - Danh sách Nhiệm vụ Chi tiết (Phiên bản đầy đủ)

## Bảng màu bắt buộc (Tham chiếu nhanh)

| Token | Hex | Dùng cho |
|---|---|---|
| **Primary** | `#543310` | Heading, CTA chính, sidebar admin, logo, text quan trọng |
| **Secondary** | `#D67D3E` | Active tab, border heading, hover CTA, trạng thái đang chọn |
| **Accent** | `#FED8B1` | Selected background, badge nhẹ, highlight, reservation pending |
| **Neutral** | `#FAF7F3` | Page background (toàn bộ nền trang) |
| **Surface** | `#FFFFFF` | Card, form, list, table surface |
| **Border** | `#E8DED5` | Border card, divider, table border |
| **Text chính** | `#222222` | Nội dung chính |
| **Text muted** | `#6B625B` | Mô tả, metadata, placeholder |
| **Error** | `#B42318` | Lỗi, hủy, payment fail, destructive action |
| **Success** | `#237A57` | Hoàn tất, payment success, ready, active |

**Font:** Playfair Display (display/heading) + Plus Jakarta Sans (body/content).
**Icon:** Lucide React.
**Quy tắc:** Không dùng purple, gradient tím, font mặc định browser. Card không lồng card.

---

# GIAI ĐOẠN 1: NỀN TẢNG (API Client & Authentication)

> Làm trước tiên. Mọi giai đoạn sau đều phụ thuộc vào Auth và API Client.

---

## Task 1.1 — API Client dùng chung

**Vị trí file:** `packages/utils/src/api-client.ts` (hoặc tạo mới trong `packages/`)
**Mục đích:** Tạo một wrapper HTTP duy nhất cho cả Customer PWA và Staff Dashboard. F1 sẽ import module này, không tự viết lại.

- [x] Tạo wrapper `fetch` hoặc `axios` instance với `baseURL` lấy từ biến môi trường (`NEXT_PUBLIC_API_URL` hoặc `VITE_API_URL`).
- [x] Tự động gắn header `Authorization: Bearer <access_token>` vào mọi request.
- [x] Parse response theo chuẩn envelope: `{ success, data, error: { code, message } }`.
- [x] Interceptor bắt lỗi `401` → tự động redirect về `/login`.
- [x] Interceptor bắt lỗi `403` → hiển thị trang Forbidden.
- [x] Parse `error.code` từ backend (ví dụ: `ERR_1001_UNAUTHORIZED`, `ERR_9001_VALIDATION_FAILED`).
- [x] Retry tự động cho request GET an toàn (tối đa 2 lần) khi gặp lỗi mạng.
- [x] Tạo component dùng chung:
  - [x] `<LoadingSkeleton />` — Skeleton placeholder khi đang fetch.
  - [x] `<ErrorState />` — Hiển thị thông báo lỗi + nút Retry. Nền `#FFFFFF`, text `#B42318`, nút retry `#543310`.
  - [x] `<EmptyState />` — Hiển thị khi danh sách rỗng. Icon muted `#6B625B`, text gợi ý.
- [x] Export module để F1 có thể import: `import { apiClient } from '@fnb/utils'`.

---

## Task 1.2 — Authentication trên Customer PWA

**Vị trí file:** `apps/customer-pwa/src/`
**Routes:** `/login`, `/register`, `/account`

### API sử dụng:
| Method | Endpoint | Mô tả |
|---|---|---|
| POST | `/api/v1/auth/register` | Đăng ký customer mới (Public) |
| POST | `/api/v1/auth/login` | Đăng nhập bằng email/password (Public) |
| POST | `/api/v1/auth/refresh` | Refresh access token (Public) |
| GET | `/api/v1/auth/me` | Lấy profile user hiện tại (Authenticated) |

### Việc cần làm:

**Trang `/login`:**
- [x] Xóa bỏ cơ chế JWT giả (mock token) trong cookie hiện tại.
- [x] Component `AuthShell`: Logo quán + heading "Đăng nhập". Nền `#FAF7F3`, heading `#543310`.
- [x] Component `AuthForm`: Input email + password.
  - [x] Label text `#222222`, focus ring `#D67D3E`.
  - [x] Lỗi validation inline màu `#B42318`.
  - [x] Nút "Đăng nhập" nền `#543310`, chữ trắng, hover nền `#D67D3E`.
- [x] Gọi `POST /api/v1/auth/login` khi submit.
- [x] Lưu access token + refresh token vào storage an toàn (httpOnly cookie hoặc secure storage).
- [x] Sau login thành công, redirect về trang trước đó (return URL) hoặc về `/`.
- [x] Xử lý lỗi: sai mật khẩu, tài khoản bị khóa (`is_active = false`), lỗi mạng.

**Trang `/register`:**
- [x] Form đăng ký: Tên, Email, Phone, Password.
- [x] Gọi `POST /api/v1/auth/register`.
- [x] Sau đăng ký thành công, tự động đăng nhập hoặc chuyển về `/login`.
- [x] Không cho client gửi field `role` (backend tự gán `CUSTOMER`).

**Auth Provider:**
- [x] Tạo hook `useCurrentUser()` hoặc React Context `AuthProvider`.
- [x] Gọi `GET /api/v1/auth/me` khi app khởi động để lấy profile, role, tenant, branch.
- [x] Logic refresh token tự động khi token sắp hết hạn.
- [x] Tạo hàm `logout()` — xóa token, redirect về `/login`.

**Route Guard:**
- [x] Bỏ cơ chế redirect bắt buộc từ `/` về `/login` (Guest phải xem được trang chủ).
- [x] Trang `/cart`, `/checkout`, `/wallet`, `/orders`, `/reservation/*` → yêu cầu login.
- [x] Khi Guest bấm action cá nhân (thêm giỏ hàng, đặt bàn) → hiện `LoginRequiredModal` với nút "Đăng nhập". Modal nền trắng, border `#E8DED5`, CTA `#543310`.

**Trạng thái phải có:** Loading auth, login thành công, sai credential (đỏ `#B42318`), tài khoản inactive, lỗi mạng có retry.

---

## Task 1.3 — Authentication trên Staff Dashboard

**Vị trí file:** `apps/staff-dashboard/src/`

### API sử dụng:
| Method | Endpoint | Mô tả |
|---|---|---|
| POST | `/api/v1/auth/login` | Đăng nhập staff/owner/support |
| GET | `/api/v1/auth/me` | Lấy role, tenant, branch thật |

### Việc cần làm:
- [x] Dùng chung Auth Provider và API Client với Customer PWA (import từ packages).
- [x] Xóa user Owner mặc định trong `authStore`. Xóa `mock-token`.
- [x] Tạo route `/login` cho Staff Dashboard.
- [x] Gọi `GET /api/v1/auth/me` khi app khởi động. Hiển thị đúng tên, role, branch thật.
- [x] Route Guard theo role:
  - [x] `OWNER` → truy cập được tất cả route admin.
  - [x] `SUPPORT` → chỉ truy cập `/support/*`.
  - [x] `STAFF` → chỉ truy cập route vận hành (POS, Floor Map, KDS — do F1 quản lý).
  - [x] Tạo trang `403 Forbidden` khi truy cập route sai quyền. Text `#B42318`, nút quay lại `#543310`.

---

# GIAI ĐOẠN 2: CUSTOMER PWA — PUBLIC STOREFRONT & MENU

> Cho phép Guest (chưa đăng nhập) xem thông tin quán và thực đơn.

---

## Task 2.1 — Trang chủ Public (`/`)

**Route:** `/`
**Quyền:** Public (không cần login)

### API sử dụng:
| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/v1/public/catalog?tenant_subdomain=&branch_id=` | Lấy menu public (không cần JWT) |

### Components cần tạo:
- [x] `PublicHeader`: Logo/tên quán, link Menu, Đặt bàn, Đăng nhập, icon cart (chỉ hiện khi đã login).
  - [x] Nền `#FFFFFF`, logo text `#543310`, link hover `#D67D3E`.
- [x] `BranchInfoBar`: Chi nhánh đang chọn, địa chỉ, giờ mở cửa, trạng thái (Đang mở/Đóng).
  - [x] Nền `#FAF7F3`, text chính `#222222`, text muted `#6B625B`.
- [x] `FeaturedMenuSection`: 3-6 món nổi bật lấy từ API.
  - [x] Card món nền `#FFFFFF`, border `#E8DED5`. Tên món `#222222`, giá `#543310`.
- [x] `PrimaryActions`: 2 nút lớn — "Xem thực đơn" và "Đặt bàn".
  - [x] Nút "Xem thực đơn" nền `#543310`, chữ trắng, hover `#D67D3E`.
  - [x] Nút "Đặt bàn" nền `#FFFFFF`, border `#543310`, chữ `#543310`.
- [x] `ContactFooter`: Hotline, địa chỉ, mạng xã hội.
- [x] `LoginRequiredModal`: Khi Guest bấm "Đặt bàn" → yêu cầu đăng nhập.

**Nền trang:** `#FAF7F3`. Heading `#543310` có underline `#D67D3E`.
**Trạng thái:** Loading skeleton, branch chưa chọn, quán đóng cửa, API lỗi + retry, menu nổi bật rỗng.

---

## Task 2.2 — Trang Menu (`/menu`, `/menu/[productId]`)

**Routes:** `/menu`, `/menu/[productId]`
**Quyền:** Public (không cần login để xem), cần login để thêm giỏ hàng.

### API sử dụng:
| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/v1/public/catalog?tenant_subdomain=&branch_id=` | Lấy categories + products public |
| GET | `/api/v1/categories` | Lấy categories (cho logged-in user) |
| GET | `/api/v1/products?category_id=` | Lấy products theo category |

### Components cần tạo:
- [x] `MenuSearchBar`: Tìm kiếm theo tên món. Border `#E8DED5`, focus `#D67D3E`.
- [x] `CategoryTabBar` / `CategoryRail`: Thanh điều hướng danh mục.
  - [x] Category active: nền `#D67D3E`, chữ trắng.
  - [x] Category chưa chọn: text `#543310` hoặc `#6B625B`.
- [x] `ProductGrid`: Lưới sản phẩm responsive (2 cột mobile, 3-4 cột tablet/desktop).
- [x] `ProductCard`: Hiển thị ảnh, tên, mô tả ngắn, giá, badge, nút thêm.
  - [x] Card nền `#FFFFFF`, border `#E8DED5`, border-radius `8px`.
  - [x] Tên món `#222222`, giá `#543310` hoặc `#D67D3E`.
  - [x] Badge "Mới"/"Phổ biến" nền `#FED8B1`, chữ `#543310`.
  - [x] Badge "Hết hàng" nền `#B42318` opacity thấp, chữ `#B42318`.
  - [x] Nút thêm: icon `Plus` (Lucide), nền `#543310`, chữ trắng.
- [x] `ProductDetailDrawer/Modal`: Mở khi click vào món.
  - [x] Ảnh lớn, tên `#543310`, mô tả `#6B625B`, giá `#543310`.
  - [x] Modifier selector (Size, Topping, Đá, Đường) nếu API trả.
  - [x] Quantity stepper: nút +/- border `#E8DED5`.
  - [x] Ghi chú cho bếp.
  - [x] Nút "Thêm vào giỏ" nền `#543310`.
  - [x] Guest bấm → hiện `LoginRequiredModal` (lưu return URL `/menu`).
- [x] `CartSummaryBar`: Thanh tổng giỏ hàng cố định ở dưới (khi đã có item).
  - [x] Nền `#543310`, chữ trắng, hiển thị số món và tổng tạm tính.

**Realtime (Đồng bộ Gap 3 - Kho):**
- [x] Lắng nghe event WebSocket `product_out_of_stock` từ B2.
- [x] Khi nhận event → tự động disable/làm mờ món đó trên grid, hiện badge "Hết hàng" mà không cần reload.

**Trạng thái:** `MenuLoading` (skeleton), `MenuEmpty` (không có món), `MenuError` (lỗi + retry).

---

# GIAI ĐOẠN 3: CUSTOMER PWA — RESERVATION, CHECKOUT & GROUP ORDER

> Luồng tạo doanh thu chính: Đặt bàn → Chọn món → Thanh toán.

---

## Task 3.1 — Reservation & Customer Floor View

**Routes:** `/floors`, `/floors/[id]`, `/reservation/[code]`
**Quyền:** `CUSTOMER` (phải đăng nhập)

### API sử dụng:
| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/v1/floors?branch_id=` | Lấy danh sách tầng |
| GET | `/api/v1/floors/:id/tables` | Lấy bàn + tọa độ + status |
| POST | `/api/v1/reservations/lock` | Lock bàn (Redis TTL 10 phút) |
| POST | `/api/v1/reservations/:code/generate-qr` | Tạo QR thanh toán cọc |
| DELETE | `/api/v1/reservations/:code` | Hủy lock bàn |

### Realtime:
| Channel | Event | Mô tả |
|---|---|---|
| `tables:{branch_id}` | `table_status_changed` | Bàn đổi trạng thái realtime |

### Màu trạng thái bàn (dùng chung `getTableColor` từ `@fnb/utils`):
| Trạng thái | Màu nền | Chữ |
|---|---|---|
| `AVAILABLE` | Xanh lá nhạt | Dark |
| `PENDING_LOCK` | `#FED8B1` + viền nhấp nháy `#D67D3E` | Dark |
| `RESERVED` | `#D67D3E` hoặc amber | Trắng |
| `OCCUPIED` | `#543310` | Trắng |
| `CLEANING` | Xám trung tính | Dark |

### Components cần tạo:
- [x] `BranchFloorSelector`: Chọn chi nhánh và tầng.
- [x] `FloorTabs`: Tab chọn tầng. Active tab `#D67D3E`, inactive `#6B625B`.
- [x] Import `FloorMapCanvas` từ F1 (`packages/ui-shared`). Chế độ **read-only** (`editable={false}`).
  - [x] Dùng `pos_x`, `pos_y`, `width`, `height`, `shape` từ API. **Không hard-code `INITIAL_TABLES`.**
- [x] `TableStatusLegend`: Bảng chú thích màu + text cho từng trạng thái.
- [x] `TableInfoDrawer`: Mã bàn, capacity, status, nút "Chọn bàn" (chỉ hiện khi `AVAILABLE`).
- [x] `ReservationLockModal`: Countdown timer, deposit amount, reservation code.
  - [x] Modal nền `#FFFFFF`, border `#FED8B1`, CTA `#543310`.
  - [x] Countdown text `#D67D3E`.
- [x] `VietQRPanel`: QR code, amount, nội dung chuyển khoản, nút copy.
  - [x] Surface trắng, border `#FED8B1`.
- [x] `ReservationResult`:
  - [x] Success: Nền `#237A57` nhạt, icon check, text "Đặt bàn thành công".
  - [x] Fail: Nền `#B42318` nhạt, text "Thanh toán thất bại".
  - [x] Expired: Text `#6B625B`, "Hết thời gian giữ bàn".

### Việc cần làm:
- [x] Load danh sách floor từ API. Load tables theo floor.
- [x] Chỉ bàn `AVAILABLE` cho phép click chọn.
- [x] Gọi `POST /reservations/lock`. Hiển thị countdown từ `expires_at` (server trả).
- [x] Gọi `POST /reservations/:code/generate-qr`. Hiển thị QR và amount cọc từ backend.
- [x] Xử lý hủy lock: gọi `DELETE /reservations/:code`.
- [x] Xử lý timeout: khi countdown hết → hiển thị expired, đưa bàn về `AVAILABLE`.
- [x] Xử lý tranh bàn: nếu bàn bị người khác lock → hiện lỗi `ERR_2002_TABLE_LOCKED`.
- [x] Subscribe `tables:{branch_id}` để nhận `table_status_changed` realtime.
- [x] Reconnect: gọi lại `GET /floors/:id/tables` để snapshot trước khi nhận diff.

**Trạng thái:** `ReservationLoading`, `ReservationError`, `NoAvailableTable`.

---

## Task 3.2 — Cart (`/cart`)

**Route:** `/cart`
**Quyền:** `CUSTOMER`

### Components cần tạo:
- [x] `CartHeader`: Nút back, link "Tiếp tục chọn món". Text `#543310`.
- [x] `CartItemRow`: Ảnh nhỏ, tên, modifier, quantity stepper (+/-), nút xóa (icon `Trash2`, màu `#B42318`).
  - [x] Card nền `#FFFFFF`, border `#E8DED5`.
  - [x] Tên `#222222`, modifier/note `#6B625B`, giá `#543310`.
- [x] `OrderNoteField`: Textarea ghi chú chung cho bếp. Border `#E8DED5`, focus `#D67D3E`.
- [x] `BranchTableSummary`: Hiển thị chi nhánh, số bàn, loại đơn.
- [x] `PriceSummary`: Subtotal, discount, total. Tổng tiền `#543310` cỡ lớn.
- [x] `EmptyCartState`: Icon giỏ hàng rỗng `#6B625B`, text "Chưa có món nào", nút "Xem menu" `#543310`.
- [x] `CheckoutButton`: Nút "Thanh toán" nền `#543310`, chữ trắng, hover `#D67D3E`. Disable khi cart rỗng.

### Việc cần làm:
- [x] Cart dùng product ID thật từ API.
- [x] Quantity +/- gọi update, xóa item.
- [x] Hiển thị modifier đã chọn.
- [x] Xử lý product bị inactive (hết hàng) → hiện cảnh báo, gợi ý xóa khỏi giỏ.
- [x] Không lưu payment result chỉ trong Zustand. Server state là nguồn sự thật.

---

## Task 3.3 — Checkout (`/checkout`)

**Route:** `/checkout`
**Quyền:** `CUSTOMER`

### API sử dụng:
| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/v1/orders/:id` | Lấy chi tiết order (amount do backend tính) |
| POST | `/api/v1/orders/:id/pay` | Thanh toán order |

### Components cần tạo:
### Components cần tạo:
- [x] `OrderReviewList`: Danh sách item đã chọn (read-only).
- [x] `OrderTypeSelector` **(Đồng bộ Gap 1 — Takeaway):**
  - [x] Toggle chọn "Dine-in" (Tại bàn) hoặc "Pickup" (Đến lấy).
  - [x] Dine-in: hiển thị số bàn. Pickup: ẩn thông tin bàn.
  - [x] Active option: border `#D67D3E`, nền `#FED8B1`. Inactive: border `#E8DED5`.
- [x] `PaymentMethodSelector`: VietQR / Wallet / Coffee Pass.
  - [x] Option active: border `#D67D3E`, nền `#FED8B1` nhạt.
  - [x] Option inactive: border `#E8DED5`.
- [x] `VoucherSelector`: Chọn voucher khả dụng. Nền `#FED8B1`.
- [x] `WalletBalanceRow`: Hiển thị số dư ví hiện tại. Số dư `#543310`.
- [x] `CoffeePassSelector`: Chọn gói Coffee Pass nếu có.
- [x] `VietQRPaymentPanel`: QR code, amount, nội dung chuyển khoản.
- [x] `PaymentStatusBanner`:
  - [x] Pending: Nền `#FED8B1`, text `#D67D3E`, icon spinner.
  - [x] Success: Nền `#237A57` nhạt, text `#237A57`, icon `CheckCircle`.
  - [x] Fail: Nền `#B42318` nhạt, text `#B42318`, icon `XCircle`.
- [x] `RetryPaymentButton`: Nút "Thử lại" nền `#543310`. Dùng idempotency key.

### Việc cần làm:
- [x] Nhận `order_id` do Staff check-in hoặc Group-Order confirm tạo ra.
- [x] Gọi `POST /api/v1/orders/:id/pay` với `payment_method` (VIETQR / WALLET / COFFEE_PASS).
- [x] Amount phải lấy từ backend (không tin total do client tính).
- [x] Disable nút thanh toán khi đang pending.
- [x] Chỉ clear cart SAU KHI backend trả success.
- [x] Không tự set payment completed ở frontend.
- [x] Retry sử dụng idempotency key để chống double charge.

---

## Task 3.4 — Group Order

**Routes:** `/group-order/[tableId]`, `/group-order/[tableId]/cart`
**Quyền:** `CUSTOMER`

### API sử dụng:
| Method | Endpoint | Mô tả |
|---|---|---|
| POST | `/api/v1/group-order/join` | Tham gia phiên đặt chung |
| GET | `/api/v1/group-order/:tableId/cart` | Xem giỏ hàng chung |
| POST | `/api/v1/group-order/:tableId/cart/items` | Thêm món vào giỏ chung |
| POST | `/api/v1/group-order/:tableId/confirm` | Xác nhận giỏ hàng → tạo order |

### Realtime:
| Channel | Event | Mô tả |
|---|---|---|
| `group_order:{tenant_id}:{table_id}` | `group_order_cart_updated` | Giỏ hàng chung cập nhật |

### Components cần tạo:
- [x] `GroupSessionHeader`: Số bàn, session status, member count. Text `#543310`.
- [x] `MemberList`: Danh sách thành viên trong phiên.
- [x] `SharedCartPanel`: Giỏ hàng chung với item + ai thêm.
  - [x] Card nền `#FFFFFF`, border `#E8DED5`.
- [x] `AddedByBadge`: Badge hiển thị tên người thêm. Nền `#FED8B1`, chữ `#543310`.
- [x] `GroupMenuPicker`: Chọn món từ menu thật (dùng product data API).
- [x] `GroupOrderConfirmBar`: Nút "Xác nhận đặt món" nền `#543310`.
- [x] `RealtimeConnectionBadge`: Trạng thái kết nối socket. Connected: `#237A57`, Reconnecting: `#D67D3E`, Offline: `#B42318`.
- [x] `SessionExpiredState`: Phiên hết hạn. Text `#B42318`.

### Việc cần làm:
- [x] Gọi `POST /group-order/join` để tham gia.
- [x] Gọi `POST /group-order/:tableId/cart/items` để thêm món.
- [x] Subscribe `group_order:{tenant_id}:{table_id}` để nhận `group_order_cart_updated`.
- [x] Reconnect: gọi `GET /group-order/:tableId/cart` để resync.
- [x] Nút Confirm chỉ bấm 1 lần (lock session). Disable sau khi bấm.
- [x] Không duplicate item khi client retry.
- [x] Hiển thị session expired khi TTL Redis hết.

---

# GIAI ĐOẠN 4: CUSTOMER PWA — ORDER HISTORY, WALLET, COFFEE PASS

> Giao diện cá nhân và loyalty giữ chân khách hàng.

---

## Task 4.1 — Order History & CSAT

**Routes:** `/orders`, `/orders/[id]`, `/order-success`
**Quyền:** `CUSTOMER`

### API sử dụng:
| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/v1/orders?page=&limit=` | Danh sách order cá nhân (phân trang) |
| GET | `/api/v1/orders/:id` | Chi tiết order |
| POST | `/api/v1/support/csat` | Gửi đánh giá CSAT |

### Components cần tạo:
- [x] `OrderFilterTabs`: Tab filter Active / Completed / Cancelled.
  - [x] Active tab: `#D67D3E` chữ trắng. Inactive: `#6B625B`.
- [x] `OrderListItem`: Order code, ngày, tổng tiền, bàn/loại đơn, status.
  - [x] Card nền `#FFFFFF`, border `#E8DED5`.
  - [x] Status badge: Pending `#D67D3E`, Completed `#237A57`, Cancelled `#B42318`.
- [x] `OrderStatusTimeline`: Dọc hiển thị: Pending → Preparing → Ready → Served → Completed.
  - [x] Bước đã qua: dot `#237A57`. Bước hiện tại: dot `#D67D3E`. Bước chưa tới: dot `#E8DED5`.
- [x] `OrderDetailItems`: Danh sách món, quantity, modifier, giá.
- [x] `PaymentSummary`: Subtotal, discount, total. Tổng `#543310`.
- [x] `CSATPrompt` (ở `/order-success`):
  - [x] `RatingStars`: 5 sao, active `#D67D3E`, inactive `#E8DED5`.
  - [x] `FeedbackTextarea`: Nhận xét. Border `#E8DED5`, focus `#D67D3E`.
  - [x] `SubmitFeedbackButton`: Nền `#543310`.
  - [x] Gọi `POST /api/v1/support/csat` với `order_id`, `score` (1-5), `note`.
  - [x] Chặn gửi trùng (đã đánh giá rồi → hiển thị "Cảm ơn bạn đã đánh giá").

**Trạng thái:** Chưa có order, loading, order not found, CSAT đã gửi.

---

## Task 4.2 — Wallet & Voucher

**Routes:** `/wallet`, `/wallet/transactions`, `/wallet/vouchers`
**Quyền:** `CUSTOMER`

### API sử dụng:
| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/v1/wallet` | Lấy main balance + promo balance |
| POST | `/api/v1/wallet/topup` | Nạp tiền vào ví |
| GET | `/api/v1/wallet/transactions` | Lịch sử giao dịch (phân trang) |
| GET | `/api/v1/wallet/vouchers` | Danh sách voucher |

### Components cần tạo:
- [x] `WalletBalanceHeader`:
  - [x] Main balance: Số lớn, màu `#543310`.
  - [x] Promo balance: Số nhỏ hơn, màu `#D67D3E`.
  - [x] Tổng: Text muted `#6B625B`.
- [x] `TopUpButton`: Nền `#543310`, chữ trắng. Mở `TopUpModal`.
- [x] `TopUpModal`: Input số tiền, nút xác nhận. Gọi `POST /api/v1/wallet/topup`.
- [x] `TransactionFilters`: Lọc theo loại (Nạp / Thanh toán / Hoàn tiền).
- [x] `TransactionTable/List`:
  - [x] Nạp tiền: icon `ArrowUp` `#237A57`.
  - [x] Thanh toán: icon `ArrowDown` `#B42318`.
  - [x] Hoàn tiền: icon `RotateCcw` `#D67D3E`.
- [x] `VoucherList`: Danh sách voucher.
- [x] `VoucherStatusBadge`:
  - [x] Active: nền `#237A57` nhạt, chữ `#237A57`.
  - [x] Used: nền xám, chữ `#6B625B`.
  - [x] Expired: nền `#B42318` nhạt, chữ `#B42318`.
- [x] `Pagination`: Phân trang. Active page `#D67D3E`.

### Việc cần làm:
- [x] Load balance từ API. **Không tự sửa balance bằng Zustand.**
- [x] Topup gọi qua backend, chỉ refresh balance SAU KHI API trả success.
- [x] Lịch sử giao dịch phân trang.
- [x] Voucher chỉ áp dụng khi backend xác nhận.

**Trạng thái:** `WalletEmpty`, `WalletError`, loading.

---

## Task 4.3 — Coffee Pass

**Routes:** `/coffee-pass`, `/coffee-pass/[id]`
**Quyền:** `CUSTOMER`

### API sử dụng:
| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/v1/coffee-pass/plans` | Lấy danh sách gói |
| POST | `/api/v1/coffee-pass/subscribe` | Mua gói (trừ ví atomic) |
| GET | `/api/v1/coffee-pass/:id/current-code` | Lấy TOTP hiện tại |

### Components cần tạo:
- [x] `PassPlanGrid`: Grid các gói Coffee Pass.
- [x] `PassPlanCard`: Tên, giá, số lượt, thời hạn.
  - [x] Card nền `#FFFFFF`, border `#E8DED5`. Giá `#543310`.
  - [x] Nút "Mua gói" nền `#543310`.
- [x] `SubscribeModal`: Xác nhận mua, hiển thị số tiền trừ từ ví.
- [x] `ActivePassHeader`: Thông tin gói đang dùng.
- [x] `RotatingCodePanel`:
  - [x] TOTP code lớn, nền `#FFFFFF`, border `#D67D3E`.
  - [x] Countdown vòng tròn 30 giây, màu `#D67D3E`.
  - [x] Auto refresh code khi hết 30s.
- [x] `RedemptionProgress`: Số lượt còn lại / tổng. Bar `#543310`.
- [x] `PassExpiredState`: Text `#B42318`, "Gói đã hết hạn".

### Việc cần làm:
- [x] Load plans từ API. Chỉ hiện plan `active` của tenant.
- [x] Gọi `POST /coffee-pass/subscribe` để mua.
- [x] Gọi `GET /coffee-pass/:id/current-code` để lấy TOTP.
- [x] Hiển thị countdown 30 giây, auto refresh.
- [x] Xử lý expired/invalid subscription.

---

# GIAI ĐOẠN 5: STAFF DASHBOARD — ADMIN & SUPPORT

> Module quản trị cho `OWNER` và CSKH cho `SUPPORT`. Chạy trong `apps/staff-dashboard`.

---

## Task 5.1 — Menu Management (`/menu-management`)

**Route:** `/menu-management`
**Quyền:** `OWNER`

### API sử dụng:
| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/v1/categories` | Lấy danh mục |
| POST | `/api/v1/categories` | Tạo danh mục |
| PATCH | `/api/v1/categories/:id` | Sửa danh mục |
| DELETE | `/api/v1/categories/:id` | Xóa danh mục (reject nếu còn product active) |
| GET | `/api/v1/products?category_id=` | Lấy sản phẩm |
| POST | `/api/v1/products` | Tạo sản phẩm |
| PATCH | `/api/v1/products/:id` | Sửa sản phẩm |
| DELETE | `/api/v1/products/:id` | Soft delete (`is_active = false`) |

### Components cần tạo:
- [x] `MenuToolbar`: Search, category filter, active filter, nút "Thêm danh mục" / "Thêm món".
  - [x] Nút thêm: nền `#543310`, chữ trắng.
- [x] `CategorySidebar/Table`: Danh sách danh mục.
- [x] `ProductTable`: Bảng sản phẩm: ảnh, tên, category, station, giá, active, actions.
  - [x] Table header: nền `#D67D3E`, chữ trắng.
  - [x] Row nền `#FFFFFF`. Giá `#543310`. Inactive → text `#6B625B` (muted).
- [x] `ProductFormModal`: Form tạo/sửa món.
  - [x] Form nền `#FFFFFF`. Label `#222222`. Focus ring `#D67D3E`.
  - [x] Kitchen station selector: `BAR` hoặc `KITCHEN`.
  - [x] Modifier editor.
  - [x] Image upload nếu backend hỗ trợ.
  - [x] Nút "Lưu" nền `#543310`.
- [x] `CategoryFormModal`: Form tạo/sửa danh mục.
- [x] `DeleteConfirmModal`: Xác nhận xóa. Nút "Xóa" nền `#B42318`, chữ trắng.
- [x] Active/Inactive toggle: Active `#237A57`, Inactive `#6B625B`.

**Trạng thái:** `MenuLoading`, `MenuEmpty`, `MenuError`. Hiển thị API error code.

---

## Task 5.2 — Staff Management (`/staff-management`)

**Route:** `/staff-management`
**Quyền:** `OWNER`

### API sử dụng:
| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/v1/staff?branch_id=` | Lấy danh sách staff |
| POST | `/api/v1/staff` | Tạo staff (backend tạo Auth user) |
| PATCH | `/api/v1/staff/:id` | Sửa staff |
| PATCH | `/api/v1/staff/:id/deactivate` | Vô hiệu hóa |

### Components cần tạo:
- [x] `StaffToolbar`: Search, role filter, branch filter, status filter, nút "Thêm nhân viên" `#543310`.
- [x] `StaffTable`: Bảng name, email/phone, role, branch, active, actions.
  - [x] Table header nền `#D67D3E`, chữ trắng.
- [x] `RoleBadge`:
  - [x] Owner: nền `#543310`, chữ trắng.
  - [x] Staff: nền `#FED8B1`, chữ `#543310`.
  - [x] Support: nền `#D67D3E`, chữ trắng.
  - [x] Inactive: nền xám `#E8DED5`, chữ `#6B625B`.
- [x] `StaffFormModal`: Chọn role hợp lệ, chọn branch.
- [x] `TemporaryCredentialModal`: Hiển thị mật khẩu tạm MỘT LẦN. Cảnh báo copy. Nền `#FED8B1`.
- [x] `DeactivateConfirmModal`: Xác nhận vô hiệu hóa. Nút "Vô hiệu hóa" nền `#B42318`.
  - [x] Chặn vô hiệu hóa Owner cuối cùng → hiển thị lỗi.

---

## Task 5.3 — Analytics & CDP

**Routes:** `/analytics`, `/cdp`, `/cdp/customers/:id`
**Quyền:** `OWNER`

### API sử dụng:
| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/v1/reports/dashboard?branch_id=` | Dữ liệu dashboard |
| GET | `/api/v1/cdp/customers?segment=` | Danh sách khách hàng phân khúc |
| GET | `/api/v1/cdp/customers/:id/360` | Chi tiết khách hàng 360 |
| POST | `/api/v1/cdp/customers/:id/vouchers` | Cấp voucher cho khách |

### Components cần tạo:
- [x] `BranchDateFilter`: Chọn branch, khoảng thời gian.
- [x] `MetricStrip`: Revenue, Orders, Occupied tables, Average order.
  - [x] Metric block nền `#FFFFFF`, border `#E8DED5`. Số chính `#543310`. Trend `#D67D3E`.
- [x] `RevenueChart`: Biểu đồ doanh thu. Phải có legend/text, không chỉ dùng màu.
- [x] `TopProductsTable`: Bảng món bán chạy.
- [x] `PaymentBreakdown`: Tỷ lệ thanh toán (Ví/QR/Tiền mặt).
- [x] `SegmentTabs`: VIP, Loyal, Churn risk, New. Active `#D67D3E`.
- [x] `CustomerTable`: Bảng khách hàng.
- [x] `Customer360Header`: Tên, phone, tier, tổng chi tiêu.
- [x] `Spend/Visit/LoyaltySummary`: Lịch sử chi tiêu, lượt ghé, hạng.
- [x] `OrderHistoryTable`: Lịch sử order của khách.
- [x] `FavoriteItems`: Món yêu thích.
- [x] `DietaryNotes`: Ghi chú dị ứng.
- [x] `IssueVoucherModal`: Form cấp voucher thủ công.

**Phong cách:** Dashboard nền `#FAF7F3`, metric surface `#FFFFFF`. Primary cho số chính, secondary cho highlight. Không lồng card nhiều lớp.

---

## Task 5.4 — Support Board & Maker-Checker

**Routes:** `/support/board`, `/support/tickets`, `/support/unmatched/:id`
**Quyền:** `SUPPORT`

### API sử dụng:
| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/v1/support/unmatched` | Danh sách giao dịch không khớp |
| GET | `/api/v1/support/unmatched/:id/suggest` | Gợi ý khách khớp (fuzzy match) |
| POST | `/api/v1/support/unmatched/:id/propose` | Maker đề xuất ghép |
| POST | `/api/v1/support/unmatched/:id/approve` | Checker duyệt đề xuất |
| GET | `/api/v1/support/tickets` | Danh sách ticket |
| POST | `/api/v1/support/tickets/:id/resolve` | Đóng ticket |
| POST | `/api/v1/support/customers/merge` | Hợp nhất 2 tài khoản khách |

### Realtime:
| Channel | Event | Mô tả |
|---|---|---|
| `support:{tenant_id}` | `unmatched_transaction_created` | Giao dịch không khớp mới |
| `support:{tenant_id}` | `support_ticket_urgent_created` | Ticket khẩn cấp mới |

### Components cần tạo:
- [x] `SupportHeader`: Tenant, connection state, notification count.
- [x] `UnmatchedQueueTable`: Bảng pending. Filter amount/date/status.
  - [x] Pending item: border `#D67D3E`.
- [x] `TransactionDetailDrawer`: Chi tiết giao dịch.
- [x] `CandidateSuggestionList`: Gợi ý khách khớp + confidence score.
- [x] `MakerProposalForm`: Form đề xuất ghép. Nút "Đề xuất" `#543310`.
- [x] `CheckerApprovalModal`: Duyệt đề xuất.
  - [x] Nút "Duyệt" nền `#543310` + confirmation dialog.
  - [x] Chặn self-approval ở UI (disable nút nếu maker === current user). Backend vẫn là authority cuối cùng.
- [x] `AuditTimeline`: Lịch sử thao tác. Nền `#FFFFFF`, border `#E8DED5`.
- [x] `UrgentTicketQueue`:
  - [x] Urgent item: border `#B42318`, icon `AlertTriangle` `#B42318`.
- [x] `TicketDetailPanel`: Complaint, transaction detail, resolution state. Không làm chat/reply trong MVP.
- [x] `ResolveTicketModal`: Đóng ticket, có thể phát voucher.
- [x] `MergeCustomerModal`:
  - [x] Nút "Hợp nhất" nền `#B42318` (destructive action).
  - [x] Warning giải thích ảnh hưởng: wallet, orders, loyalty sẽ được gộp.

### Việc cần làm:
- [x] Subscribe `support:{tenant_id}` để nhận realtime events.
- [x] Reconnect → resync danh sách.
- [x] Maker propose → ghi `maker_user_id`.
- [x] Checker approve → reject nếu cùng người đề xuất (`ERR_6002_SELF_APPROVAL`).
- [x] Mutation thành công mới remove item khỏi queue.

---

## Task 5.5 — Quản lý Ca làm việc (`/shifts`) — (Bổ sung Gap 2)

**Route:** `/shifts`
**Quyền:** `OWNER`

### API sử dụng (do B2 bàn giao):
| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/v1/shifts?branch_id=` | Lịch sử ca làm việc |

### Việc cần làm:
- [x] Dashboard xem lịch sử ca làm việc của nhân viên.
- [x] Bảng đối chiếu: Tiền mặt đầu ca, doanh thu trong ca (tiền mặt / chuyển khoản), tiền nhân viên đếm lúc đóng ca, khoản chênh lệch.
  - [x] Table header nền `#D67D3E`, chữ trắng.
  - [x] Chênh lệch dương: `#237A57`. Chênh lệch âm: `#B42318`.

---

## Task 5.6 — Quản lý Kho & Định lượng (`/inventory`) — (Bổ sung Gap 3)

**Route:** `/inventory`
**Quyền:** `OWNER`

### API sử dụng (do B2 bàn giao):
| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/v1/inventory/ingredients` | Danh sách nguyên vật liệu |
| POST | `/api/v1/inventory/ingredients` | Tạo nguyên vật liệu |
| GET | `/api/v1/inventory/recipes?product_id=` | Định lượng theo sản phẩm |
| POST | `/api/v1/inventory/transactions` | Nhập/Xuất kho thủ công |

### Việc cần làm:
- [x] Giao diện danh mục Nguyên vật liệu (CRUD).
  - [x] Table header nền `#D67D3E`, chữ trắng.
- [x] Cấu hình Định lượng (Recipes): Gắn nguyên vật liệu + số lượng tiêu hao vào từng Product.
- [x] Màn hình xem tồn kho hiện tại và lịch sử xuất nhập kho.
  - [x] Tồn kho thấp: highlight row `#B42318` nhạt.
  - [x] Tồn kho đủ: text `#237A57`.

---

# GIAI ĐOẠN 6: KIỂM THỬ & BÀN GIAO

---

## Task 6.1 — Kiểm thử Customer PWA

- [x] Guest mở `/` và `/menu` không cần login.
- [x] Guest bấm "Thêm giỏ hàng" → yêu cầu login.
- [x] Customer đăng ký / đăng nhập / đăng xuất thành công.
- [x] Customer xem menu từ API thật (không còn mock).
- [x] Customer xem floor/layout bàn thật (không hard-code).
- [x] Hai customer tranh cùng 1 bàn → 1 người nhận lỗi `ERR_2002_TABLE_LOCKED`.
- [x] Cart/order reload không mất dữ liệu.
- [x] Payment success / fail / retry hoạt động đúng.
- [x] Group-order 2 thiết bị cùng bàn: cart đồng bộ realtime.
- [x] Wallet balance/history hiển thị đúng.
- [x] Coffee Pass code countdown 30 giây.
- [x] CSAT gửi trùng bị chặn.
- [x] Món hết hàng (event `product_out_of_stock`) tự disable trên menu.

## Task 6.2 — Kiểm thử Admin/Support

- [x] Owner truy cập đúng tất cả route admin.
- [x] Staff không vào được `/menu-management`, `/staff-management`.
- [x] Support không vào được Owner-only route.
- [x] Menu CRUD hoạt động (tạo/sửa/xóa category + product).
- [x] Staff CRUD/deactivate hoạt động. Chặn deactivate Owner cuối.
- [x] Analytics hiển thị empty state khi chưa có dữ liệu.
- [x] Customer 360 hiển thị đúng thông tin.
- [x] Support maker-checker: Maker đề xuất → Checker duyệt → Self-approval bị chặn.
- [x] Urgent ticket hiển thị realtime khi có CSAT 1-2 sao.

## Task 6.3 — Bàn giao với F1

- [x] Dùng chung auth/session provider.
- [x] Dùng chung API client (F1 import từ packages).
- [x] Import `FloorMapCanvas` của F1 từ `packages/ui-shared`.
- [x] Thống nhất màu status table (`getTableColor` từ `@fnb/utils`).
- [x] Thống nhất layout shell (sidebar, header).
- [x] Không fork logic realtime.
- [x] Gửi F1 danh sách endpoint/frontend state đã tích hợp.

---

*Hoàn thành tất cả 6 giai đoạn trên = F2 đã sẵn sàng cho demo và vận hành thực tế.*
