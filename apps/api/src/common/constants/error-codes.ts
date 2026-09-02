import { HttpStatus } from '@nestjs/common';

/**
 * Toàn bộ mã lỗi chuẩn — khớp 1-1 với ERROR_CODES.md.
 * Dùng chung cho cả B1 (Auth/Floor/Menu/Staff/CDP) và B2
 * (Reservation/Order/Group-Order/Wallet/Support) để tránh lệch format
 * — CODING_CONVENTION.md mục 1.4: exception filter toàn cục map lỗi
 * nghiệp vụ sang bảng này.
 *
 * ERR_3002 giữ HTTP 200 đúng như ERROR_CODES.md ghi chú (nghiệp vụ,
 * không phải lỗi kỹ thuật) — không throw qua AppException, service tự
 * trả response thành công kèm error.code này trong data khi cần.
 */
export const ERROR_HTTP_STATUS: Record<string, HttpStatus> = {
  // 1xxx — Auth & phân quyền
  ERR_1001_UNAUTHORIZED: HttpStatus.UNAUTHORIZED,
  ERR_1002_FORBIDDEN_ROLE: HttpStatus.FORBIDDEN,
  ERR_1003_TENANT_MISMATCH: HttpStatus.FORBIDDEN,
  ERR_1004_INVALID_CREDENTIALS: HttpStatus.UNAUTHORIZED,

  // 2xxx — Floor / Table
  ERR_2001_TABLE_NOT_FOUND: HttpStatus.NOT_FOUND,
  ERR_2002_TABLE_LOCKED: HttpStatus.CONFLICT,
  ERR_2003_INVALID_TABLE_STATUS_TRANSITION: HttpStatus.BAD_REQUEST,

  // 3xxx — Reservation & Payment
  ERR_3001_RESERVATION_EXPIRED: HttpStatus.GONE,
  ERR_3002_PAYMENT_CONTENT_MISMATCH: HttpStatus.OK,
  ERR_3003_INSUFFICIENT_WALLET_BALANCE: HttpStatus.BAD_REQUEST,
  ERR_3004_COFFEE_PASS_EXPIRED: HttpStatus.BAD_REQUEST,
  ERR_3005_INVALID_TOTP_CODE: HttpStatus.BAD_REQUEST,

  // 4xxx — Order / POS
  ERR_4001_ORDER_NOT_FOUND: HttpStatus.NOT_FOUND,
  ERR_4002_ORDER_ALREADY_COMPLETED: HttpStatus.CONFLICT,
  ERR_4003_EMPTY_ORDER_SUBMIT: HttpStatus.BAD_REQUEST,

  // 5xxx — Group-Order
  ERR_5001_SESSION_NOT_FOUND: HttpStatus.NOT_FOUND,
  ERR_5002_SESSION_ALREADY_CONFIRMED: HttpStatus.CONFLICT,

  // 6xxx — CDP / CSKH
  ERR_6001_UNMATCHED_TX_NOT_FOUND: HttpStatus.NOT_FOUND,
  ERR_6002_SELF_APPROVAL: HttpStatus.FORBIDDEN,
  ERR_6003_TICKET_ALREADY_RESOLVED: HttpStatus.CONFLICT,
  ERR_6004_MERGE_SAME_CUSTOMER: HttpStatus.BAD_REQUEST,
  ERR_6005_CSAT_ALREADY_SUBMITTED: HttpStatus.CONFLICT,

  // 7xxx — Menu (Category / Product)
  ERR_7001_CATEGORY_NOT_FOUND: HttpStatus.NOT_FOUND,
  ERR_7002_PRODUCT_NOT_FOUND: HttpStatus.NOT_FOUND,
  ERR_7003_CATEGORY_HAS_PRODUCTS: HttpStatus.BAD_REQUEST,

  // 8xxx — Staff Management
  ERR_8001_STAFF_NOT_FOUND: HttpStatus.NOT_FOUND,
  ERR_8002_STAFF_PHONE_EXISTS: HttpStatus.CONFLICT,
  ERR_8003_CANNOT_DEACTIVATE_LAST_OWNER: HttpStatus.BAD_REQUEST,

  // 9xxx — Chung
  ERR_9001_VALIDATION_FAILED: HttpStatus.BAD_REQUEST,
  ERR_9002_INTERNAL_SERVER_ERROR: HttpStatus.INTERNAL_SERVER_ERROR,
  ERR_9003_RATE_LIMITED: HttpStatus.TOO_MANY_REQUESTS,
};

export type ErrorCode = keyof typeof ERROR_HTTP_STATUS;
