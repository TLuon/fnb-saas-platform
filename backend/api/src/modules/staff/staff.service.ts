import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { SupabaseService } from '../../config/supabase.service.js';
import { AppException } from '../../common/exceptions/app.exception.js';
import { CreateStaffDto } from './dto/create-staff.dto.js';
import { UpdateStaffDto } from './dto/update-staff.dto.js';

@Injectable()
export class StaffService {
  constructor(private readonly supabase: SupabaseService) {}

  /** API_CONTRACT.md mục 4 — GET /staff?branch_id=. RLS (owner_staff_read) tự lọc theo tenant. */
  async listStaff(accessToken: string, branchId: string) {
    const client = this.supabase.forUser(accessToken);
    const { data, error } = await client
      .from('users')
      .select('id, full_name, role, phone, branch_id, is_active, created_at')
      .eq('branch_id', branchId)
      .in('role', ['STAFF', 'SUPPORT'])
      .order('full_name', { ascending: true });

    if (error) throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', error.message);
    return data;
  }

  /**
   * API_CONTRACT.md mục 4 — POST /staff (OWNER).
   * "Backend tạo/invite Supabase Auth user và tự sinh auth_user_id;
   * không nhận auth_user_id từ client."
   *
   * GHI CHÚ THIẾT KẾ: dùng admin.createUser (auto-confirm) thay vì
   * admin.inviteUserByEmail vì dự án chưa cấu hình email provider thật
   * (không có trong SETUP.md) — invite email sẽ không gửi được trong
   * môi trường demo/local. Mật khẩu tạm được sinh ngẫu nhiên và trả về
   * MỘT LẦN DUY NHẤT trong response để OWNER gửi thủ công cho nhân
   * viên (đủ dùng cho phạm vi đồ án — production thật nên đổi sang
   * inviteUserByEmail khi có SMTP provider).
   */
  async createStaff(accessToken: string, tenantId: string, dto: CreateStaffDto) {
    const admin = this.supabase.admin();
    const tempPassword = randomBytes(9).toString('base64url'); // 12 ký tự, đủ mạnh cho mật khẩu tạm

    const { data: createdAuthUser, error: createAuthError } = await admin.auth.admin.createUser({
      email: dto.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: dto.full_name },
    });

    if (createAuthError || !createdAuthUser?.user) {
      throw new AppException(
        'ERR_9001_VALIDATION_FAILED',
        createAuthError?.message ?? 'Không thể tạo tài khoản nhân viên',
      );
    }
    const authUserId = createdAuthUser.user.id;

    // Insert qua client forUser (RLS owner_staff_write yêu cầu role_app=OWNER
    // của người gọi) thay vì admin — vẫn tôn trọng RLS dù đã verify OWNER ở
    // RolesGuard, đúng nguyên tắc phòng thủ 2 lớp của dự án.
    const client = this.supabase.forUser(accessToken);
    const { data: staff, error: staffError } = await client
      .from('users')
      .insert({
        auth_user_id: authUserId,
        tenant_id: tenantId,
        branch_id: dto.branch_id ?? null,
        full_name: dto.full_name,
        role: dto.role,
        phone: dto.phone,
        is_active: true,
      })
      .select('id, full_name, role, phone, branch_id, is_active')
      .single();

    if (staffError || !staff) {
      await admin.auth.admin.deleteUser(authUserId); // dọn rác, tránh Auth user mồ côi
      throw new AppException(
        'ERR_8002_STAFF_PHONE_EXISTS',
        'Số điện thoại đã tồn tại trong tenant khi tạo nhân viên mới',
      );
    }

    return { ...staff, temp_password: tempPassword };
  }

  /** API_CONTRACT.md mục 4 — PATCH /staff/:id (OWNER). */
  async updateStaff(accessToken: string, id: string, dto: UpdateStaffDto) {
    const client = this.supabase.forUser(accessToken);
    const { data, error } = await client
      .from('users')
      .update(dto)
      .eq('id', id)
      .select('id, full_name, role, phone, branch_id, is_active')
      .maybeSingle();

    if (error) throw new AppException('ERR_9001_VALIDATION_FAILED', error.message);
    if (!data) throw new AppException('ERR_8001_STAFF_NOT_FOUND', 'Không tìm thấy nhân viên');
    return data;
  }

  /**
   * API_CONTRACT.md mục 4 — PATCH /staff/:id/deactivate (OWNER).
   * ERR_8003_CANNOT_DEACTIVATE_LAST_OWNER nếu đây là OWNER cuối cùng.
   *
   * GHI CHÚ GIỚI HẠN: "revoke phiên đăng nhập nếu có" — set
   * users.is_active=false chặn NGAY việc cấp JWT mới (custom_access_
   * token_hook không tìm thấy user active nên role_app trả về NULL ở
   * lần login/refresh tiếp theo, SupabaseAuthGuard sẽ chặn). Tuy nhiên
   * một access token ĐÃ CẤP TRƯỚC ĐÓ và chưa hết hạn (tối đa 1 giờ theo
   * mặc định Supabase) vẫn còn hiệu lực cho tới khi hết hạn tự nhiên —
   * dự án chưa xác nhận được API thu hồi session tức thời ổn định
   * trong bản supabase-js đang dùng, nên chấp nhận độ trễ thu hồi tối
   * đa 1 giờ này cho phạm vi đồ án thay vì đoán một lệnh API rủi ro gãy
   * lúc chạy thật.
   */
  async deactivateStaff(accessToken: string, id: string) {
    const client = this.supabase.forUser(accessToken);

    const { data: target, error: fetchError } = await client
      .from('users')
      .select('id, tenant_id, role, is_active')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', fetchError.message);
    if (!target) throw new AppException('ERR_8001_STAFF_NOT_FOUND', 'Không tìm thấy nhân viên');

    if (target.role === 'OWNER' && target.is_active) {
      const { count, error: countError } = await client
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', target.tenant_id)
        .eq('role', 'OWNER')
        .eq('is_active', true);

      if (countError) throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', countError.message);
      if ((count ?? 0) <= 1) {
        throw new AppException(
          'ERR_8003_CANNOT_DEACTIVATE_LAST_OWNER',
          'Không được vô hiệu hóa tài khoản OWNER cuối cùng của tenant',
        );
      }
    }

    const { data, error } = await client
      .from('users')
      .update({ is_active: false })
      .eq('id', id)
      .select('id, full_name, role, is_active')
      .single();

    if (error) throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', error.message);
    return data;
  }

  /** API_CONTRACT.md mục 4 — POST /staff/:id/reset-password (OWNER). */
  async resetStaffPassword(accessToken: string, id: string, customPassword?: string) {
    const client = this.supabase.forUser(accessToken);
    const { data: target, error } = await client
      .from('users')
      .select('id, auth_user_id, full_name, role')
      .eq('id', id)
      .maybeSingle();

    if (error || !target) {
      throw new AppException('ERR_8001_STAFF_NOT_FOUND', 'Không tìm thấy thông tin nhân viên');
    }

    if (!target.auth_user_id) {
      throw new AppException('ERR_9001_VALIDATION_FAILED', 'Tài khoản nhân viên chưa liên kết Auth ID');
    }

    const newPassword = customPassword && customPassword.trim().length >= 6
      ? customPassword.trim()
      : randomBytes(6).toString('hex');

    const admin = this.supabase.admin();
    const { error: updateError } = await admin.auth.admin.updateUserById(target.auth_user_id, {
      password: newPassword,
    });

    if (updateError) {
      throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', updateError.message || 'Không thể đặt lại mật khẩu');
    }

    return {
      id: target.id,
      full_name: target.full_name,
      new_password: newPassword,
    };
  }
}

