# ERROR_CODES.md — Mã Lỗi Chuẩn Hóa

> Dùng trong toàn bộ response `error.code` theo envelope định nghĩa tại `API_CONTRACT.md`. FE dùng `error.code` để tra bảng này quyết định thông báo cho người dùng — **không** hard-code chuỗi message tiếng Việt phía FE ngoài bảng này.

## 1. Auth & phân quyền (1xxx)

| Code | HTTP | Ý nghĩa |
|---|---|---|
| `ERR_1001_UNAUTHORIZED` | 401 | Thiếu hoặc sai JWT |
| `ERR_1002_FORBIDDEN_ROLE` | 403 | `role_app` không đủ quyền cho endpoint (xem `API_CONTRACT.md` cột Role) |
| `ERR_1003_TENANT_MISMATCH` | 403 | Cố truy cập dữ liệu ngoài `tenant_id` của JWT (RLS chặn ở DB, lỗi này là guard chặn sớm ở NestJS) |
| `ERR_1004_INVALID_CREDENTIALS` | 401 | Sai số điện thoại/email hoặc mật khẩu |

## 2. Floor / Table (2xxx)

| Code | HTTP | Ý nghĩa |
|---|---|---|
| `ERR_2001_TABLE_NOT_FOUND` | 404 | `table_id` không tồn tại hoặc không thuộc tenant |
| `ERR_2002_TABLE_LOCKED` | 409 | Bàn đang bị khóa bởi khách khác (`PENDING_LOCK` còn hiệu lực) — tham chiếu `API_CONTRACT.md#5` |
| `ERR_2003_INVALID_TABLE_STATUS_TRANSITION` | 400 | Chuyển trạng thái bàn không hợp lệ (vd. `AVAILABLE → OCCUPIED` trực tiếp mà bỏ qua check-in) |

## 3. Reservation & Payment (3xxx)

| Code | HTTP | Ý nghĩa |
|---|---|---|
| `ERR_3001_RESERVATION_EXPIRED` | 410 | Quá 10 phút khóa bàn (TTL Redis hết hạn) — xem `SPEC.md` Giai đoạn 2 |
| `ERR_3002_PAYMENT_CONTENT_MISMATCH` | 200 (nghiệp vụ) | Nội dung chuyển khoản không khớp `reservation_code`/`order_code` → tự động tạo `unmatched_transactions`, không phải lỗi kỹ thuật |
| `ERR_3003_INSUFFICIENT_WALLET_BALANCE` | 400 | Ví trả trước không đủ số dư |
| `ERR_3004_COFFEE_PASS_EXPIRED` | 400 | Gói Coffee Pass hết hạn hoặc hết lượt (`remaining_redemptions = 0`) |
| `ERR_3005_INVALID_TOTP_CODE` | 400 | Mã TOTP sai hoặc đã hết hiệu lực 30s |

## 4. Order / POS (4xxx)

| Code | HTTP | Ý nghĩa |
|---|---|---|
| `ERR_4001_ORDER_NOT_FOUND` | 404 | |
| `ERR_4002_ORDER_ALREADY_COMPLETED` | 409 | Cố sửa order đã `COMPLETED` |
| `ERR_4003_EMPTY_ORDER_SUBMIT` | 400 | Gửi bếp khi chưa có `order_items` |

## 5. Group-Order (5xxx)

| Code | HTTP | Ý nghĩa |
|---|---|---|
| `ERR_5001_SESSION_NOT_FOUND` | 404 | Session Redis của bàn không tồn tại/đã hết hạn |
| `ERR_5002_SESSION_ALREADY_CONFIRMED` | 409 | Giỏ hàng chung đã được chốt gửi bếp, không thể thêm món |

## 6. CDP / CSKH (6xxx)

| Code | HTTP | Ý nghĩa |
|---|---|---|
| `ERR_6001_UNMATCHED_TX_NOT_FOUND` | 404 | |
| `ERR_6002_SELF_APPROVAL` | 403 | Checker trùng với Maker — vi phạm quy tắc Maker-Checker (xem `API_CONTRACT.md#10`) |
| `ERR_6003_TICKET_ALREADY_RESOLVED` | 409 | |
| `ERR_6004_MERGE_SAME_CUSTOMER` | 400 | `source_id` và `target_id` trùng nhau khi gọi `fn_merge_customer_profiles` |
| `ERR_6005_CSAT_ALREADY_SUBMITTED` | 409 | Order đã có ticket CSAT — không cho gửi đánh giá lần 2 (xem `API_CONTRACT.md#10`) |

## 7. Menu — Category / Product (7xxx)

| Code | HTTP | Ý nghĩa |
|---|---|---|
| `ERR_7001_CATEGORY_NOT_FOUND` | 404 | |
| `ERR_7002_PRODUCT_NOT_FOUND` | 404 | |
| `ERR_7003_CATEGORY_HAS_PRODUCTS` | 400 | Không thể xóa danh mục còn `products.is_active = true` (xem `API_CONTRACT.md#3`) |

## 8. Staff Management (8xxx)

| Code | HTTP | Ý nghĩa |
|---|---|---|
| `ERR_8001_STAFF_NOT_FOUND` | 404 | |
| `ERR_8002_STAFF_PHONE_EXISTS` | 409 | Số điện thoại đã tồn tại trong tenant khi tạo nhân viên mới |
| `ERR_8003_CANNOT_DEACTIVATE_LAST_OWNER` | 400 | Không được vô hiệu hóa tài khoản OWNER cuối cùng của tenant |

## 9. Chung (9xxx)

| Code | HTTP | Ý nghĩa |
|---|---|---|
| `ERR_9001_VALIDATION_FAILED` | 400 | DTO không hợp lệ (kèm `error.details` là mảng field lỗi) |
| `ERR_9002_INTERNAL_SERVER_ERROR` | 500 | Lỗi không xác định — log vào `audit_logs`/server log, không lộ chi tiết cho FE |
| `ERR_9003_RATE_LIMITED` | 429 | Quá số request cho phép (áp dụng cho `/auth/login`, webhook) |
