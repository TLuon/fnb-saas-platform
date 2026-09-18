import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.service.js';
import { AppException } from '../../common/exceptions/app.exception.js';
import type { AuthenticatedUser } from '../../common/types/auth.types.js';
import { OpenShiftDto } from './dto/open-shift.dto.js';
import { CloseShiftDto } from './dto/close-shift.dto.js';
import { ListShiftsQueryDto } from './dto/list-shifts-query.dto.js';

@Injectable()
export class ShiftService {
  constructor(private readonly supabase: SupabaseService) {}

  /** Mở ca làm việc mới cho chi nhánh */
  async openShift(accessToken: string, user: AuthenticatedUser, dto: OpenShiftDto) {
    if (user.role_app === 'STAFF') {
      if (!user.branch_id) {
        throw new AppException('ERR_9001_VALIDATION_FAILED', 'Tài khoản chưa được gán chi nhánh');
      }
      if (dto.branch_id && dto.branch_id !== user.branch_id) {
        throw new AppException('ERR_9001_VALIDATION_FAILED', 'Nhân viên không có quyền mở ca cho chi nhánh khác');
      }
    }

    const branchId = user.role_app === 'STAFF' ? user.branch_id : (dto.branch_id || user.branch_id);
    if (!branchId) {
      throw new AppException('ERR_9001_VALIDATION_FAILED', 'Thiếu thông tin branch_id');
    }

    const client = this.supabase.forUser(accessToken);

    // 1. Kiểm tra xem chi nhánh đã có ca nào đang mở chưa
    const { data: activeShift, error: checkError } = await client
      .from('shifts')
      .select('id, branch_id, status')
      .eq('branch_id', branchId)
      .eq('status', 'OPEN')
      .maybeSingle();

    if (checkError) throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', checkError.message);
    if (activeShift) {
      throw new AppException('ERR_9001_VALIDATION_FAILED', 'Chi nhánh hiện đang có một ca làm việc mở');
    }

    // 2. Resolve public.users.id từ auth_user_id (user.sub)
    const appUserId = await this.resolvePublicUserId(client, user);

    // 3. Tạo ca mới
    const { data, error } = await client
      .from('shifts')
      .insert({
        tenant_id: user.tenant_id,
        branch_id: branchId,
        opened_by: appUserId,
        starting_cash: dto.starting_cash,
        notes: dto.notes ?? null,
        status: 'OPEN',
      })
      .select()
      .single();

    if (error) throw new AppException('ERR_9001_VALIDATION_FAILED', error.message);

    // Ghi audit log mở ca
    const supabaseAdmin = this.supabase.admin();
    await supabaseAdmin.from('audit_logs').insert({
      tenant_id: user.tenant_id,
      actor_user_id: user.sub,
      action: 'OPEN_SHIFT',
      entity_type: 'shifts',
      entity_id: data.id,
      metadata: {
        branch_id: branchId,
        starting_cash: dto.starting_cash,
      },
    });

    return data;
  }

  /** Đóng ca làm việc và đối soát tiền kết ca */
  async closeShift(accessToken: string, user: AuthenticatedUser, shiftId: string, dto: CloseShiftDto) {
    const client = this.supabase.forUser(accessToken);

    // 1. Kiểm tra ca làm việc
    const { data: shift, error: fetchError } = await client
      .from('shifts')
      .select('*')
      .eq('id', shiftId)
      .maybeSingle();

    if (fetchError) throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', fetchError.message);
    if (!shift) throw new AppException('ERR_9001_VALIDATION_FAILED', 'Không tìm thấy ca làm việc');
    if (shift.status === 'CLOSED') {
      throw new AppException('ERR_9001_VALIDATION_FAILED', 'Ca làm việc này đã được đóng trước đó');
    }

    if (user.role_app === 'STAFF' && user.branch_id && shift.branch_id !== user.branch_id) {
      throw new AppException('ERR_9001_VALIDATION_FAILED', 'Nhân viên không có quyền đóng ca của chi nhánh khác');
    }

    // 2. Resolve public.users.id từ auth_user_id (user.sub)
    const appUserId = await this.resolvePublicUserId(client, user);

    // 3. Tính toán tiền mặt dự kiến dựa trên orders thanh toán CASH trong ca
    const { data: cashOrders, error: ordersError } = await client
      .from('orders')
      .select('final_amount')
      .eq('shift_id', shiftId)
      .eq('status', 'COMPLETED')
      .eq('payment_method', 'CASH');

    if (ordersError) throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', ordersError.message);

    const totalCashOrders = (cashOrders ?? []).reduce(
      (sum, o) => sum + Number(o.final_amount || 0),
      0,
    );
    const startingCash = Number(shift.starting_cash || 0);
    const expectedCash = startingCash + totalCashOrders;
    const actualCash = Number(dto.ending_cash);
    const difference = actualCash - expectedCash;

    // 4. Cập nhật đóng ca kèm thông tin đối soát
    const reconciliationNote = `Đối soát tiền mặt: Khởi đầu=${startingCash}, Tiền mặt đơn=${totalCashOrders}, Dự kiến=${expectedCash}, Thực tế=${actualCash}, Chênh lệch=${difference}`;
    const updatedNotes = dto.notes
      ? shift.notes
        ? `${shift.notes} | Đóng ca: ${dto.notes} [${reconciliationNote}]`
        : `${dto.notes} [${reconciliationNote}]`
      : shift.notes
        ? `${shift.notes} [${reconciliationNote}]`
        : reconciliationNote;

    const { data, error } = await client
      .from('shifts')
      .update({
        closed_by: appUserId,
        closed_at: new Date().toISOString(),
        ending_cash: dto.ending_cash,
        status: 'CLOSED',
        notes: updatedNotes,
      })
      .eq('id', shiftId)
      .select()
      .single();

    if (error) throw new AppException('ERR_9001_VALIDATION_FAILED', error.message);

    // Ghi audit log đóng ca
    const supabaseAdmin = this.supabase.admin();
    await supabaseAdmin.from('audit_logs').insert({
      tenant_id: user.tenant_id,
      actor_user_id: user.sub,
      action: 'CLOSE_SHIFT',
      entity_type: 'shifts',
      entity_id: shiftId,
      metadata: {
        starting_cash: startingCash,
        total_cash_orders: totalCashOrders,
        expected_cash: expectedCash,
        ending_cash: actualCash,
        difference,
      },
    });

    return {
      ...data,
      expected_cash: expectedCash,
      actual_cash: actualCash,
      difference,
    };
  }

  /** Lấy ca làm việc đang mở hiện tại của chi nhánh */
  async getCurrentShift(
    accessToken: string,
    userOrBranchId: AuthenticatedUser | string,
    queryBranchId?: string,
  ) {
    let branchId: string | null | undefined;

    if (!userOrBranchId) {
      throw new AppException('ERR_9001_VALIDATION_FAILED', 'Tài khoản chưa được gán chi nhánh');
    }

    if (typeof userOrBranchId === 'string') {
      branchId = userOrBranchId;
    } else {
      const user = userOrBranchId;
      if (user.role_app === 'STAFF') {
        if (!user.branch_id) {
          throw new AppException('ERR_9001_VALIDATION_FAILED', 'Tài khoản chưa được gán chi nhánh');
        }
        if (queryBranchId && queryBranchId !== user.branch_id) {
          throw new AppException('ERR_9001_VALIDATION_FAILED', 'Nhân viên không có quyền truy cập chi nhánh khác');
        }
        branchId = user.branch_id;
      } else {
        branchId = queryBranchId || user.branch_id;
      }
    }

    if (!branchId || typeof branchId !== 'string' || branchId.trim() === '') {
      throw new AppException('ERR_9001_VALIDATION_FAILED', 'Tài khoản chưa được gán chi nhánh');
    }

    const client = this.supabase.forUser(accessToken);
    const { data, error } = await client
      .from('shifts')
      .select('*')
      .eq('branch_id', branchId)
      .eq('status', 'OPEN')
      .maybeSingle();

    if (error) throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', error.message);
    return data ?? null;
  }

  /** Lịch sử các ca làm việc */
  async listShifts(
    accessToken: string,
    userOrQuery: AuthenticatedUser | ListShiftsQueryDto,
    maybeQuery?: ListShiftsQueryDto,
  ) {
    let user: AuthenticatedUser | undefined;
    let query: ListShiftsQueryDto;

    if (maybeQuery !== undefined) {
      user = userOrQuery as AuthenticatedUser;
      query = maybeQuery || {};
    } else if (userOrQuery && 'role_app' in userOrQuery) {
      user = userOrQuery as AuthenticatedUser;
      query = {};
    } else {
      query = (userOrQuery as ListShiftsQueryDto) || {};
    }

    let targetBranchId = query.branch_id;

    if (user && user.role_app === 'STAFF') {
      if (!user.branch_id) {
        throw new AppException('ERR_9001_VALIDATION_FAILED', 'Tài khoản chưa được gán chi nhánh');
      }
      if (query.branch_id && query.branch_id !== user.branch_id) {
        throw new AppException('ERR_9001_VALIDATION_FAILED', 'Nhân viên không có quyền truy cập chi nhánh khác');
      }
      targetBranchId = user.branch_id;
    }

    const client = this.supabase.forUser(accessToken);
    let builder = client
      .from('shifts')
      .select('id, tenant_id, branch_id, opened_by, closed_by, opened_at, closed_at, starting_cash, ending_cash, status, notes, created_at')
      .order('opened_at', { ascending: false });

    if (targetBranchId) {
      builder = builder.eq('branch_id', targetBranchId);
    }
    if (query.status) {
      builder = builder.eq('status', query.status);
    }

    const { data, error } = await builder;
    if (error) throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', error.message);
    return data ?? [];
  }

  /** Resolve public.users.id from auth_user_id (user.sub) & tenant_id */
  private async resolvePublicUserId(client: any, user: AuthenticatedUser): Promise<string> {
    const { data: appUser, error: appUserError } = await client
      .from('users')
      .select('id')
      .eq('auth_user_id', user.sub)
      .eq('tenant_id', user.tenant_id)
      .maybeSingle();

    if (appUserError) {
      throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', appUserError.message);
    }
    if (!appUser) {
      throw new AppException('ERR_1001_UNAUTHORIZED', 'Không tìm thấy thông tin tài khoản người dùng');
    }

    return appUser.id;
  }
}
