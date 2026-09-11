import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.service.js';
import { AppException } from '../../common/exceptions/app.exception.js';
import { AuthenticatedUser } from '../../common/types/auth.types.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshDto } from './dto/refresh.dto.js';

@Injectable()
export class AuthService {
  constructor(private readonly supabase: SupabaseService) { }

  /**
   * POST /api/v1/auth/register
   *
   * MVP hiện tại:
   * - bắt buộc email
   * - phone vẫn lưu làm dữ liệu nghiệp vụ
   * - user đăng ký public là CUSTOMER
   */
  async register(dto: RegisterDto) {
    if (!dto.email) {
      throw new AppException(
        'ERR_9001_VALIDATION_FAILED',
        'Cần cung cấp email để tạo tài khoản đăng nhập (đăng nhập bằng phone chưa được hỗ trợ ở MVP này)',
        [
          {
            field: 'email',
            message: 'email is required in this MVP',
          },
        ],
      );
    }

    const admin = this.supabase.admin();

    // =========================================================
    // 1. Kiểm tra tenant tồn tại
    // =========================================================
    const { data: tenant, error: tenantError } = await admin
      .from('tenants')
      .select('id')
      .eq('subdomain', dto.tenant_subdomain)
      .maybeSingle();

    if (tenantError || !tenant) {
      throw new AppException(
        'ERR_9001_VALIDATION_FAILED',
        'tenant_subdomain không tồn tại',
        [
          {
            field: 'tenant_subdomain',
            message: tenantError?.message ?? 'not found',
          },
        ],
      );
    }

    // =========================================================
    // 2. Tạo Supabase Auth user
    // =========================================================
    const { data: createdAuthUser, error: createAuthError } =
      await admin.auth.admin.createUser({
        email: dto.email,
        password: dto.password,
        email_confirm: true,
        user_metadata: {
          full_name: dto.full_name,
        },
      });

    if (createAuthError || !createdAuthUser?.user) {
      throw new AppException(
        'ERR_9001_VALIDATION_FAILED',
        createAuthError?.message ?? 'Không thể tạo tài khoản',
      );
    }

    const authUserId = createdAuthUser.user.id;

    // =========================================================
    // 3. Tạo customer profile
    // =========================================================
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
      // rollback auth user vừa tạo
      await admin.auth.admin.deleteUser(authUserId);

      throw new AppException(
        'ERR_9001_VALIDATION_FAILED',
        'Không thể tạo hồ sơ khách hàng',
        [
          {
            field: 'customer',
            message: customerError?.message ?? 'customer insert failed',
          },
        ],
      );
    }

    // =========================================================
    // 4. Tạo wallet
    //
    // Schema hiện tại của bảng wallets KHÔNG có tenant_id.
    // Vì vậy chỉ insert customer_id.
    // =========================================================
    const { error: walletError } = await admin
      .from('wallets')
      .insert({
        customer_id: customer.id,
      });

    if (walletError) {
      // rollback customer
      await admin
        .from('customers')
        .delete()
        .eq('id', customer.id);

      // rollback auth user
      await admin.auth.admin.deleteUser(authUserId);

      throw new AppException(
        'ERR_9002_INTERNAL_SERVER_ERROR',
        'Không thể khởi tạo ví khách hàng',
        [
          {
            field: 'wallet',
            message: walletError.message,
          },
        ],
      );
    }

    // =========================================================
    // 5. Thành công
    // =========================================================
    return {
      customer_id: customer.id,
      email: dto.email,
    };
  }

  /**
   * POST /api/v1/auth/login
   */
  async login(dto: LoginDto) {
    if (!dto.email && !dto.phone) {
      throw new AppException(
        'ERR_9001_VALIDATION_FAILED',
        'Cần cung cấp email hoặc phone để đăng nhập',
      );
    }

    if (!dto.email) {
      throw new AppException(
        'ERR_9001_VALIDATION_FAILED',
        'Đăng nhập bằng phone chưa được hỗ trợ ở MVP này, vui lòng dùng email',
      );
    }

    const { data, error } = await this.supabase
      .anon()
      .auth.signInWithPassword({
        email: dto.email,
        password: dto.password,
      });

    if (error || !data.session) {
      throw new AppException(
        'ERR_1004_INVALID_CREDENTIALS',
        'Sai email hoặc mật khẩu',
      );
    }

    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in: data.session.expires_in,
      token_type: data.session.token_type,
    };
  }

  /**
   * POST /api/v1/auth/refresh
   */
  async refresh(dto: RefreshDto) {
    const { data, error } = await this.supabase
      .anon()
      .auth.refreshSession({
        refresh_token: dto.refresh_token,
      });

    if (error || !data.session) {
      throw new AppException(
        'ERR_1001_UNAUTHORIZED',
        'Refresh token không hợp lệ hoặc đã hết hạn',
      );
    }

    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in: data.session.expires_in,
      token_type: data.session.token_type,
    };
  }

  /**
   * GET /api/v1/auth/me
   */
  async me(user: AuthenticatedUser, accessToken: string) {
    const client = this.supabase.forUser(accessToken);

    if (user.role_app === 'CUSTOMER') {
      const { data: profile, error } = await client
        .from('customers')
        .select(
          'id, full_name, email, phone, membership_tier, loyalty_points',
        )
        .eq('auth_user_id', user.sub)
        .maybeSingle();

      if (error) {
        throw new AppException(
          'ERR_9002_INTERNAL_SERVER_ERROR',
          'Không thể tải hồ sơ khách hàng',
        );
      }

      return {
        ...user,
        profile,
      };
    }

    const { data: profile, error } = await client
      .from('users')
      .select('id, full_name, phone, is_active')
      .eq('auth_user_id', user.sub)
      .maybeSingle();

    if (error) {
      throw new AppException(
        'ERR_9002_INTERNAL_SERVER_ERROR',
        'Không thể tải hồ sơ người dùng',
      );
    }

    return {
      ...user,
      profile,
    };
  }
}