import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Cấp Supabase client cho tầng service.
 *
 * QUAN TRỌNG (RLS_POLICIES.md mục 5 / CODING_CONVENTION.md mục 1.3):
 * - `forUser(jwt)` tạo client forward đúng JWT của request hiện tại —
 *   mọi query qua client này bị RLS filter đúng theo tenant/role của
 *   user đang gọi. Đây là client DUY NHẤT được dùng trong các route
 *   nghiệp vụ thông thường.
 * - `admin()` dùng service_role key, BỎ QUA RLS hoàn toàn. Chỉ dùng cho
 *   job hệ thống nội bộ (vd. tạo/molify tài khoản Staff qua Supabase Auth
 *   Admin API ở module Staff Management) — KHÔNG dùng trong request path
 *   thông thường của người dùng cuối.
 */
@Injectable()
export class SupabaseService {
  private readonly url: string;
  private readonly anonKey: string;
  private readonly serviceRoleKey: string;
  private adminClient: SupabaseClient | null = null;

  constructor(private readonly config: ConfigService) {
    this.url = this.config.get<string>('supabase.url') ?? '';
    this.anonKey = this.config.get<string>('supabase.anonKey') ?? '';
    this.serviceRoleKey = this.config.get<string>('supabase.serviceRoleKey') ?? '';
  }

  forUser(accessToken: string): SupabaseClient {
    return createClient(this.url, this.anonKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  /** Client không JWT — chỉ tôn trọng RLS mặc định (role anon), dùng cho route @Public(). */
  anon(): SupabaseClient {
    return createClient(this.url, this.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  admin(): SupabaseClient {
    if (!this.adminClient) {
      this.adminClient = createClient(this.url, this.serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
    }
    return this.adminClient;
  }
}
