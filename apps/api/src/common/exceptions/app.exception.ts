import { HttpException } from '@nestjs/common';
import { ERROR_HTTP_STATUS, ErrorCode } from '../constants/error-codes.js';

/**
 * Exception nghiệp vụ chuẩn — mọi service (B1 và B2) throw exception này
 * thay vì HttpException thường, để GlobalExceptionFilter map đúng
 * envelope error.code theo ERROR_CODES.md.
 *
 * Ví dụ dùng trong service:
 *   throw new AppException('ERR_2002_TABLE_LOCKED', 'Bàn đang bị khóa bởi khách khác');
 */
export class AppException extends HttpException {
  public readonly code: ErrorCode;
  public readonly details?: unknown;

  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message, ERROR_HTTP_STATUS[code] ?? 500);
    this.code = code;
    this.details = details;
  }
}
