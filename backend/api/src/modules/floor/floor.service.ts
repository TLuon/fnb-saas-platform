import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.service.js';
import { AppException } from '../../common/exceptions/app.exception.js';
import { CreateFloorDto } from './dto/create-floor.dto.js';
import { CreateTableDto } from './dto/create-table.dto.js';
import { UpdateTableDto } from './dto/update-table.dto.js';
import { TableStatus, UpdateTableStatusDto } from './dto/update-table-status.dto.js';

/**
 * State machine cho chuyển trạng thái THỦ CÔNG bởi STAFF qua
 * PATCH /tables/:id/status — ERROR_CODES.md ERR_2003 nêu ví dụ cụ thể
 * "AVAILABLE → OCCUPIED trực tiếp mà bỏ qua check-in" là không hợp lệ.
 *
 * GHI CHÚ THIẾT KẾ: API_CONTRACT.md/ERD.md không liệt kê đầy đủ bảng
 * chuyển trạng thái, nên state machine dưới đây là suy luận hợp lý từ
 * nghiệp vụ SPEC.md mục 4 — chỉ cho STAFF các thao tác "dọn dẹp thủ
 * công". Các chuyển trạng thái còn lại (AVAILABLE→PENDING_LOCK,
 * PENDING_LOCK→RESERVED, RESERVED→OCCUPIED) do module Reservation/Order
 * (B2) tự cập nhật trực tiếp trong luồng nghiệp vụ của họ, KHÔNG đi qua
 * endpoint này — nếu team thấy cần STAFF thao tác thêm case nào, mở
 * rộng map bên dưới và báo lại nhóm.
 */
const ALLOWED_MANUAL_TRANSITIONS: Record<TableStatus, TableStatus[]> = {
  AVAILABLE: ['CLEANING', 'OCCUPIED'],
  PENDING_LOCK: ['AVAILABLE', 'OCCUPIED'],
  RESERVED: ['AVAILABLE', 'OCCUPIED'],
  OCCUPIED: ['CLEANING', 'AVAILABLE'],
  CLEANING: ['AVAILABLE', 'OCCUPIED'],
};

@Injectable()
export class FloorService {
  constructor(private readonly supabase: SupabaseService) {}

  /** Lấy danh sách chi nhánh của tenant hiện tại */
  async listBranches(accessToken: string, tenantId: string) {
    const client = this.supabase.forUser(accessToken);
    const { data, error } = await client
      .from('branches')
      .select('id, tenant_id, name, address, created_at')
      .eq('tenant_id', tenantId)
      .order('name', { ascending: true });

    if (error) throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', error.message);
    return data ?? [];
  }

  /** API_CONTRACT.md mục 2 — GET /floors?branch_id=. RLS tự lọc theo tenant. */
  async listFloors(accessToken: string, branchId: string) {
    const client = this.supabase.forUser(accessToken);
    const { data, error } = await client
      .from('floors')
      .select('id, branch_id, name, floor_level, background_svg, created_at')
      .eq('branch_id', branchId)
      .order('floor_level', { ascending: true });

    if (error) throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', error.message);
    return data;
  }

  /** API_CONTRACT.md mục 2 — POST /floors (OWNER). */
  async createFloor(accessToken: string, dto: CreateFloorDto) {
    const client = this.supabase.forUser(accessToken);
    const { data, error } = await client.from('floors').insert(dto).select().single();

    // RLS (tenant_boundary trên floors, join qua branches) tự chặn nếu
    // branch_id không thuộc tenant của OWNER đang gọi — lỗi trả về ở
    // đây thường là do vi phạm policy đó.
    if (error) throw new AppException('ERR_9001_VALIDATION_FAILED', error.message);
    return data;
  }

  /**
   * API_CONTRACT.md mục 2 — GET /floors/:id/tables.
   * Không có mã lỗi riêng cho "floor not found" trong ERROR_CODES.md —
   * floor không tồn tại (hoặc không thuộc tenant, bị RLS chặn) đơn giản
   * trả về mảng rỗng thay vì lỗi, đúng ngữ nghĩa "tầng này không có bàn
   * nào nhìn thấy được".
   */
  async getFloorTables(accessToken: string, floorId: string) {
    const client = this.supabase.forUser(accessToken);
    const { data, error } = await client
      .from('tables')
      .select('id, floor_id, table_code, capacity, pos_x, pos_y, width, height, shape, status, current_order_id')
      .eq('floor_id', floorId)
      .order('table_code', { ascending: true });

    if (error) throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', error.message);
    if (!data || data.length === 0) return [];

    const reservedTableIds = data.filter((t) => t.status === 'RESERVED').map((t) => t.id);
    if (reservedTableIds.length === 0) return data;

    // Fetch active reservations for RESERVED tables
    const admin = this.supabase.admin();
    const { data: reservations } = await admin
      .from('reservations')
      .select('id, table_id, customer_name, customer_phone, reservation_time, reservation_code, deposit_amount')
      .in('table_id', reservedTableIds)
      .eq('status', 'PAID')
      .order('created_at', { ascending: false });

    if (!reservations || reservations.length === 0) return data;

    const resMap = new Map<string, any>();
    for (const r of reservations) {
      if (!resMap.has(r.table_id)) {
        resMap.set(r.table_id, r);
      }
    }

    return data.map((t) => {
      const res = resMap.get(t.id);
      if (res) {
        return {
          ...t,
          customer_name: res.customer_name,
          customer_phone: res.customer_phone,
          reservation_time: res.reservation_time,
          reservation_code: res.reservation_code,
          reservation: res,
        };
      }
      return t;
    });
  }

  /** API_CONTRACT.md mục 2 — POST /tables (OWNER). */
  async createTable(accessToken: string, dto: CreateTableDto) {
    const client = this.supabase.forUser(accessToken);
    const { data, error } = await client.from('tables').insert(dto).select().single();

    if (error) throw new AppException('ERR_9001_VALIDATION_FAILED', error.message);
    return data;
  }

  /** API_CONTRACT.md mục 2 — PATCH /tables/:id (OWNER, kéo-thả Floor Editor). */
  async updateTable(accessToken: string, tableId: string, dto: UpdateTableDto) {
    const client = this.supabase.forUser(accessToken);
    const { data, error } = await client
      .from('tables')
      .update(dto)
      .eq('id', tableId)
      .select()
      .maybeSingle();

    if (error) throw new AppException('ERR_9001_VALIDATION_FAILED', error.message);
    if (!data) throw new AppException('ERR_2001_TABLE_NOT_FOUND', 'Không tìm thấy bàn');
    return data;
  }

  /**
   * API_CONTRACT.md mục 2 — PATCH /tables/:id/status (STAFF).
   * Đổi trạng thái thủ công, validate qua state machine ở trên. Việc
   * UPDATE bảng `tables` tự động kích hoạt Supabase Realtime WAL broadcast
   * cho kênh `tables:{branch_id}` — KHÔNG cần emit thủ công (khác các
   * event Socket.IO khác), xem REALTIME_EVENTS.md mục 2.1.
   */
  async updateTableStatus(accessToken: string, tableId: string, dto: UpdateTableStatusDto) {
    const client = this.supabase.forUser(accessToken);

    const { data: current, error: fetchError } = await client
      .from('tables')
      .select('id, status')
      .eq('id', tableId)
      .maybeSingle();

    if (fetchError) throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', fetchError.message);
    if (!current) throw new AppException('ERR_2001_TABLE_NOT_FOUND', 'Không tìm thấy bàn');

    const currentStatus = current.status as TableStatus;
    const allowedNext = ALLOWED_MANUAL_TRANSITIONS[currentStatus] ?? [];
    if (!allowedNext.includes(dto.status)) {
      throw new AppException(
        'ERR_2003_INVALID_TABLE_STATUS_TRANSITION',
        `Không thể chuyển bàn từ ${currentStatus} sang ${dto.status} theo cách thủ công`,
      );
    }

    const updatePayload: Record<string, any> = {
      status: dto.status,
      updated_at: new Date().toISOString(),
    };
    if (dto.status === 'AVAILABLE') {
      updatePayload.current_order_id = null;
    }

    const { data, error } = await client
      .from('tables')
      .update(updatePayload)
      .eq('id', tableId)
      .select()
      .single();

    if (error) throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', error.message);
    return data;
  }
}
