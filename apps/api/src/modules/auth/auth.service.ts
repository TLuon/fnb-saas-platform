import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.service.js';
import { AppException } from '../../common/exceptions/app.exception.js';
import { AuthenticatedUser } from '../../common/types/auth.types.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshDto } from './dto/refresh.dto.js';

@Injectable()
export class AuthService {
  constructor(private readonly supabase: SupabaseService) {}

  /**
   * API_CONTRACT.md mục 1 — POST /auth/register.
   * "Một Auth user chỉ thuộc một customer/tenant trong MVP".
   *
   * GHI CHÚ GIỚI HẠN: dự án chưa cấu hình nhà cung cấp SMS (không có
   * trong SETUP.md), nên Supabase Auth đăng nhập bằng phone chưa hoạt
   * động được ở MVP này — bắt buộc có `email` để tạo tài khoản đăng
   * nhập được. `phone` vẫn lưu vào bảng `customers` làm dữ liệu nghiệp
   * vụ (liên hệ, CDP...) như API_CONTRACT.md mô tả.
   */
  async register(dto: RegisterDto) {
    if (!dto.email) {
      throw new AppException(
        'ERR_9001_VALIDATION_FAILED',
        'Cần cung cấp email để tạo tài khoản đăng nhập (đăng nhập bằng phone chưa được hỗ trợ ở MVP này)',
        [{ field: 'email', message: 'email is required in this MVP' }],
      );
    }

    const admin = this.supabase.admin();

    const { data: tenant, error: tenantError } = await admin
      .from('tenants')
      .select('id')
      .eq('subdomain', dto.tenant_subdomain)
      .maybeSingle();

    if (tenantError || !tenant) {
      throw new AppException(
        'ERR_9001_VALIDATION_FAILED',
        'tenant_subdomain không tồn tại',
        [{ field: 'tenant_subdomain', message: 'not found' }],
      );
    }

    // Tạo Auth user với quyền admin (service_role) — auto-confirm để bỏ
    // qua bước xác nhận email (dự án chưa cấu hình email provider thật).
    // KHÔNG nhận role từ client — user_metadata chỉ lưu full_name hiển
    // thị, custom_access_token_hook không đọc user_metadata nên dù
    // client cố chèn field lạ vào đây cũng không có quyền gì thêm.
    const { data: createdAuthUser, error: createAuthError } = await admin.auth.admin.createUser({
      email: dto.email,
      password: dto.password,
      email_confirm: true,
      user_metadata: { full_name: dto.full_name },
    });

    if (createAuthError || !createdAuthUser?.user) {
      throw new AppException(
        'ERR_9001_VALIDATION_FAILED',
        createAuthError?.message ?? 'Không thể tạo tài khoản',
      );
    }

    const authUserId = createdAuthUser.user.id;

    const { data: customer, error: customerError } = await admin
      .from('customers')
      .insert({
        auth_user_id: authUserId,
        tenant_id: tenant.id,
        phone: dto.phone,
        full_name: dto.full_name,
        email: dto.email,
      })
      .select('id')
      .single();

    if (customerError || !customer) {
      // Dọn lại Auth user vừa tạo để tránh rác "user không có customer"
      // — thường gặp nhất là trùng (tenant_id, phone) — UNIQUE constraint
      // trong 001_init.sql.
      await admin.auth.admin.deleteUser(authUserId);
      throw new AppException(
        'ERR_9001_VALIDATION_FAILED',
        'Số điện thoại đã được đăng ký trong hệ thống này',
        [{ field: 'phone', message: customerError?.message }],
      );
    }

    const { error: walletError } = await admin
      .from('wallets')
      .insert({ customer_id: customer.id });

    if (walletError) {
      throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', 'Không thể khởi tạo ví khách hàng');
    }

    return { customer_id: customer.id, email: dto.email };
  }

  /** API_CONTRACT.md mục 1 — POST /auth/login. */
  async login(dto: LoginDto) {
    if (!dto.email && !dto.phone) {
      throw new AppException(
        'ERR_9001_VALIDATION_FAILED',
        'Cần cung cấp email hoặc phone để đăng nhập',
      );
    }
    if (!dto.email) {
      // Xem ghi chú giới hạn ở register() — đăng nhập bằng phone chưa
      // hỗ trợ trong MVP vì chưa có SMS provider.
      throw new AppException(
        'ERR_9001_VALIDATION_FAILED',
        'Đăng nhập bằng phone chưa được hỗ trợ ở MVP này, vui lòng dùng email',
      );
    }

    const { data, error } = await this.supabase
      .anon()
      .auth.signInWithPassword({ email: dto.email, password: dto.password });

    if (error || !data.session) {
      throw new AppException('ERR_1004_INVALID_CREDENTIALS', 'Sai email hoặc mật khẩu');
    }

    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in: data.session.expires_in,
      token_type: data.session.token_type,
    };
  }

  /** API_CONTRACT.md mục 1 — POST /auth/refresh. */
  async refresh(dto: RefreshDto) {
    const { data, error } = await this.supabase
      .anon()
      .auth.refreshSession({ refresh_token: dto.refresh_token });

    if (error || !data.session) {
      throw new AppException('ERR_1001_UNAUTHORIZED', 'Refresh token không hợp lệ hoặc đã hết hạn');
    }

    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in: data.session.expires_in,
      token_type: data.session.token_type,
    };
  }

  /**
   * API_CONTRACT.md mục 1 — GET /auth/me.
   * Trả claims từ JWT (đã verify ở SupabaseAuthGuard) kèm hồ sơ đầy đủ
   * từ bảng users/customers tương ứng.
   */
  async me(user: AuthenticatedUser, accessToken: string) {
    const client = this.supabase.forUser(accessToken);

    if (user.role_app === 'CUSTOMER') {
      const { data: profile } = await client
        .from('customers')
        .select('id, full_name, email, phone, membership_tier, loyalty_points')
        .eq('auth_user_id', user.sub)
        .maybeSingle();
      return { ...user, profile };
    }

    const { data: profile } = await client
      .from('users')
      .select('id, full_name, phone, is_active')
      .eq('auth_user_id', user.sub)
      .maybeSingle();
    return { ...user, profile };
  }
}
