import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Đánh dấu route không cần JWT — khớp API_CONTRACT.md các route ghi "Public"
 * (vd. POST /auth/register, POST /auth/login, POST /auth/refresh,
 * POST /reservations/webhook/mock-payment).
 *
 * Dùng: @Public() @Post('login') login() { ... }
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
