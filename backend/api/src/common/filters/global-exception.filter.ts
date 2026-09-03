import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { AppException } from '../exceptions/app.exception.js';
import { ErrorResponse } from '../types/response.types.js';

/**
 * Exception filter toàn cục — CODING_CONVENTION.md mục 1.4:
 * "Exception filter toàn cục map lỗi nghiệp vụ sang ERROR_CODES.md,
 * không để lộ stack trace ở production".
 *
 * Xử lý 3 trường hợp:
 * 1. AppException (lỗi nghiệp vụ do service tự throw) → giữ nguyên code/message
 * 2. ValidationPipe (class-validator) ném BadRequestException với mảng lỗi
 *    → map sang ERR_9001_VALIDATION_FAILED, details = mảng field lỗi
 * 3. Lỗi không xác định khác → ERR_9002_INTERNAL_SERVER_ERROR, ẩn chi tiết
 *    thật với client, chỉ log ở server
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof AppException) {
      const body: ErrorResponse = {
        success: false,
        data: null,
        error: {
          code: exception.code,
          message: exception.message,
          ...(exception.details ? { details: exception.details } : {}),
        },
      };
      response.status(exception.getStatus()).json(body);
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      const isValidationError =
        status === HttpStatus.BAD_REQUEST &&
        typeof payload === 'object' &&
        payload !== null &&
        Array.isArray((payload as { message?: unknown }).message);

      const body: ErrorResponse = {
        success: false,
        data: null,
        error: isValidationError
          ? {
              code: 'ERR_9001_VALIDATION_FAILED',
              message: 'Dữ liệu gửi lên không hợp lệ',
              details: (payload as { message: unknown }).message,
            }
          : {
              code: `ERR_HTTP_${status}`,
              message:
                typeof payload === 'string'
                  ? payload
                  : ((payload as { message?: string })?.message ?? exception.message),
            },
      };
      response.status(status).json(body);
      return;
    }

    // Lỗi không xác định — log đầy đủ ở server, không lộ cho client
    this.logger.error(
      exception instanceof Error ? exception.stack : String(exception),
    );
    const body: ErrorResponse = {
      success: false,
      data: null,
      error: {
        code: 'ERR_9002_INTERNAL_SERVER_ERROR',
        message: 'Đã có lỗi xảy ra, vui lòng thử lại sau',
      },
    };
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(body);
  }
}
