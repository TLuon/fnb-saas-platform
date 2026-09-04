import { Global, Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { SupabaseService } from '../config/supabase.service.js';
import { SupabaseAuthGuard } from './guards/supabase-auth.guard.js';
import { TenantGuard } from './guards/tenant.guard.js';
import { RolesGuard } from './guards/roles.guard.js';
import { ResponseInterceptor } from './interceptors/response.interceptor.js';
import { GlobalExceptionFilter } from './filters/global-exception.filter.js';

/**
 * Áp dụng guard/interceptor/filter TOÀN CỤC qua token APP_GUARD/
 * APP_INTERCEPTOR/APP_FILTER thay vì phải @UseGuards() thủ công trên
 * từng controller — đảm bảo không route nào bị bỏ sót do quên khai báo.
 * Route công khai dùng @Public() để bypass (khớp CODING_CONVENTION.md
 * mục 1.3, chỉ khác cách áp dụng: global thay vì lặp lại mỗi controller).
 *
 * Thứ tự chạy guard: SupabaseAuthGuard (xác thực JWT) → TenantGuard
 * (chặn sớm tenant rỗng) → RolesGuard (so khớp @Roles()) — NestJS chạy
 * guard theo đúng thứ tự khai báo trong mảng providers bên dưới.
 */
@Global()
@Module({
  providers: [
    SupabaseService,
    { provide: APP_GUARD, useClass: SupabaseAuthGuard },
    { provide: APP_GUARD, useClass: TenantGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
  exports: [SupabaseService],
})
export class CommonModule {}
