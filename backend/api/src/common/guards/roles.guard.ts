import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppException } from '../exceptions/app.exception.js';
import { AuthenticatedRequest, RoleApp } from '../types/auth.types.js';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';

/**
 * Chạy SAU SupabaseAuthGuard (thứ tự trong @UseGuards() quan trọng —
 * xem CODING_CONVENTION.md mục 1.3). Nếu route không khai báo @Roles(),
 * mặc định cho phép mọi role đã đăng nhập (khớp cột Role = "Tất cả"
 * trong API_CONTRACT.md, vd. GET /auth/me).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const requiredRoles = this.reflector.getAllAndOverride<RoleApp[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userRole = request.user?.role_app;

    if (!userRole || !requiredRoles.includes(userRole)) {
      throw new AppException(
        'ERR_1002_FORBIDDEN_ROLE',
        `Vai trò ${userRole ?? 'không xác định'} không có quyền truy cập endpoint này`,
      );
    }
    return true;
  }
}
