import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedRequest, AuthenticatedUser } from '../types/auth.types.js';

/**
 * Lấy user hiện tại (đã decode từ JWT) trong controller.
 * Ví dụ: getMe(@CurrentUser() user: AuthenticatedUser) { ... }
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.user;
  },
);

/**
 * Lấy JWT access token gốc của request hiện tại — dùng để tạo
 * Supabase client forward đúng quyền RLS (SupabaseService.forUser()).
 */
export const CurrentAccessToken = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.accessToken;
  },
);
