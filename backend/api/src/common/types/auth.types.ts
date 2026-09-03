import type { Request } from 'express';

/** Vai trò nghiệp vụ — khớp SPEC.md mục 2 và CHECK constraint trong 001_init.sql */
export type RoleApp = 'OWNER' | 'STAFF' | 'SUPPORT' | 'CUSTOMER';

/**
 * Claims tùy chỉnh được custom_access_token_hook (003_rls.sql) chèn vào JWT.
 * role_app dùng tên riêng để tránh trùng claim `role` mặc định của Supabase
 * (Supabase luôn set role="authenticated") — xem SPEC.md mục 2.
 */
export interface AuthenticatedUser {
  /** auth.uid() — Supabase Auth user id */
  sub: string;
  role_app: RoleApp;
  tenant_id: string;
  /** NULL với SUPPORT (không gắn 1 chi nhánh cụ thể) và CUSTOMER */
  branch_id: string | null;
  email?: string;
}

/** Gắn vào Request sau khi qua SupabaseAuthGuard */
export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
  /** JWT gốc, dùng để tạo Supabase client forward đúng quyền RLS */
  accessToken: string;
}
