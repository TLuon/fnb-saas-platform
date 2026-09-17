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
    const client = this.supabase.forUser(accessToken);

    // 1. Kiểm tra xem chi nhánh đã có ca nào đang mở chưa
    const { data: activeShift, error: checkError } = await client
      .from('shifts')
      .select('id, branch_id, status')
      .eq('branch_id', dto.branch_id)
      .eq('status', 'OPEN')
      .maybeSingle();

    if (checkError) throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', checkError.message);
    if (activeShift) {
      throw new AppException('ERR_9001_VALIDATION_FAILED', 'Chi nhánh hiện đang có một ca làm việc mở');
    }

    // 2. Tạo ca mới
    const { data, error } = await client
      .from('shifts')
      .insert({
        tenant_id: user.tenant_id,
        branch_id: dto.branch_id,
        opened_by: user.id,
        starting_cash: dto.starting_cash,
        notes: dto.notes ?? null,
        status: 'OPEN',
      })
      .select()
      .single();

    if (error) throw new AppException('ERR_9001_VALIDATION_FAILED', error.message);
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

    // 2. Cập nhật đóng ca
    const updatedNotes = dto.notes
      ? shift.notes
        ? `${shift.notes} | Đóng ca: ${dto.notes}`
        : dto.notes
      : shift.notes;

    const { data, error } = await client
      .from('shifts')
      .update({
        closed_by: user.id,
        closed_at: new Date().toISOString(),
        ending_cash: dto.ending_cash,
        status: 'CLOSED',
        notes: updatedNotes,
      })
      .eq('id', shiftId)
      .select()
      .single();

    if (error) throw new AppException('ERR_9001_VALIDATION_FAILED', error.message);
    return data;
  }

  /** Lấy ca làm việc đang mở hiện tại của chi nhánh */
  async getCurrentShift(accessToken: string, branchId: string) {
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
  async listShifts(accessToken: string, query: ListShiftsQueryDto) {
    const client = this.supabase.forUser(accessToken);
    let builder = client
      .from('shifts')
      .select('id, tenant_id, branch_id, opened_by, closed_by, opened_at, closed_at, starting_cash, ending_cash, status, notes, created_at')
      .order('opened_at', { ascending: false });

    if (query.branch_id) {
      builder = builder.eq('branch_id', query.branch_id);
    }
    if (query.status) {
      builder = builder.eq('status', query.status);
    }

    const { data, error } = await builder;
    if (error) throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', error.message);
    return data ?? [];
  }
}
