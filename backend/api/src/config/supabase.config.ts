import { registerAs } from '@nestjs/config';

/**
 * Đọc biến môi trường Supabase — khớp SETUP.md mục 7 (apps/api/.env).
 * KHÔNG bao giờ forward serviceRoleKey ra route của người dùng
 * (chỉ dùng cho job hệ thống / seed script) — xem RLS_POLICIES.md mục 5.
 */
export default registerAs('supabase', () => ({
  url: process.env.SUPABASE_URL ?? '',
  anonKey: process.env.SUPABASE_ANON_KEY ?? '',
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  jwtIssuer: process.env.JWT_ISSUER ?? '',
}));
