import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppException } from '../exceptions/app.exception.js';
import { AuthenticatedRequest } from '../types/auth.types.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';

/**
 * ERROR_CODES.md ERR_1003_TENANT_MISMATCH: "RLS chặn ở DB, lỗi này là
 * guard chặn sớm ở NestJS" — tức đây là lớp phòng thủ THỨ NHẤT (nhanh,
 * không tốn round-trip DB), RLS ở 003_rls.sql là lớp phòng thủ CUỐI
 * CÙNG (luôn đúng dù bug ở tầng nào). Guard này không thay thế RLS.
 *
 * MVP: chỉ xác nhận JWT có tenant_id hợp lệ (không rỗng) trước khi vào
 * service — việc so khớp tenant_id của record cụ thể (vd. table_id có
 * thuộc đúng tenant hay không) vẫn để RLS ở tầng DB xử lý, vì so khớp
 * đó cần query DB nên làm ở guard sẽ tốn thêm 1 round-trip không cần
 * thiết cho mọi request.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.user?.tenant_id) {
      throw new AppException(
        'ERR_1003_TENANT_MISMATCH',
        'Tài khoản không thuộc tenant nào hợp lệ',
      );
    }
    return true;
  }
}
