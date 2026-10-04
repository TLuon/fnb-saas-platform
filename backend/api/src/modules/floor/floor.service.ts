import { Injectable, Optional } from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.service.js';
import { AppException } from '../../common/exceptions/app.exception.js';
import { CreateFloorDto } from './dto/create-floor.dto.js';
import { UpdateFloorDto } from './dto/update-floor.dto.js';
import { CreateTableDto } from './dto/create-table.dto.js';
import { UpdateTableDto } from './dto/update-table.dto.js';
import { TableStatus, UpdateTableStatusDto } from './dto/update-table-status.dto.js';
import { RealtimeGateway } from '../../common/realtime/realtime.gateway.js';

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
  constructor(
    private readonly supabase: SupabaseService,
    @Optional() private readonly realtimeGateway?: RealtimeGateway,
  ) {}

  /** Lấy danh sách chi nhánh của tenant hiện tại */
  async listBranches(accessToken: string, tenantId: string) {
    const client = accessToken ? this.supabase.forUser(accessToken) : this.supabase.admin();
    const { data, error } = await client
      .from('branches')
      .select('id, tenant_id, name, address, created_at')
      .eq('tenant_id', tenantId || '11111111-1111-1111-1111-111111111111')
      .order('name', { ascending: true });

    if (error) throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', error.message);
    return data ?? [];
  }

  /** API_CONTRACT.md mục 2 — GET /floors?branch_id=. RLS tự lọc theo tenant. */
  async listFloors(accessToken: string, branchId: string) {
    const client = accessToken ? this.supabase.forUser(accessToken) : this.supabase.admin();
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
    const client = this.supabase.admin();
    const { data: existingFloors } = await client
      .from('floors')
      .select('floor_level')
      .eq('branch_id', dto.branch_id)
      .order('floor_level', { ascending: false });

    const maxLevel = existingFloors && existingFloors.length > 0 ? existingFloors[0].floor_level : 0;
    const insertPayload = {
      branch_id: dto.branch_id,
      name: dto.name,
      floor_level: dto.floor_level ?? (maxLevel + 1),
    };

    const { data, error } = await client.from('floors').insert(insertPayload).select().single();

    if (error) throw new AppException('ERR_9001_VALIDATION_FAILED', error.message);
    return data;
  }

  /** Cập nhật tên/thông tin tầng (OWNER, STAFF) */
  async updateFloor(accessToken: string, floorId: string, dto: UpdateFloorDto) {
    const client = this.supabase.admin();
    const updatePayload: Record<string, any> = {};
    if (dto.name !== undefined) updatePayload.name = dto.name;
    if (dto.floor_level !== undefined) updatePayload.floor_level = dto.floor_level;
    if (dto.background_svg !== undefined) updatePayload.background_svg = dto.background_svg;

    const { data, error } = await client
      .from('floors')
      .update(updatePayload)
      .eq('id', floorId)
      .select()
      .maybeSingle();

    if (error) throw new AppException('ERR_9001_VALIDATION_FAILED', error.message);
    if (!data) throw new AppException('ERR_2001_TABLE_NOT_FOUND', 'Không tìm thấy tầng');
    return data;
  }

  /** Xóa tầng và toàn bộ bàn/vật trang trí của tầng đó */
  async deleteFloor(accessToken: string, floorId: string) {
    const client = this.supabase.admin();
    // Tables cascade delete via foreign key or manual delete
    await client.from('tables').delete().eq('floor_id', floorId);
    const { data, error } = await client
      .from('floors')
      .delete()
      .eq('id', floorId)
      .select()
      .maybeSingle();

    if (error) throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', error.message);
    return data ?? { id: floorId, deleted: true };
  }

  /** Sao chép bàn ghế và địa hình trang trí từ một tầng khác */
  async cloneFloorLayout(accessToken: string, targetFloorId: string, sourceFloorId: string) {
    const client = this.supabase.admin();
    const { data: sourceTables, error: fetchErr } = await client
      .from('tables')
      .select('*')
      .eq('floor_id', sourceFloorId);

    if (fetchErr) throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', fetchErr.message);
    if (!sourceTables || sourceTables.length === 0) {
      return [];
    }

    const newRows = sourceTables.map((t) => ({
      floor_id: targetFloorId,
      table_code: t.table_code,
      capacity: t.capacity ?? 4,
      pos_x: t.pos_x,
      pos_y: t.pos_y,
      width: t.width ?? 80,
      height: t.height ?? 80,
      shape: t.shape || 'rectangle',
      status: 'AVAILABLE',
      updated_at: new Date().toISOString(),
    }));

    const { data: inserted, error: insertErr } = await client
      .from('tables')
      .insert(newRows)
      .select();

    if (insertErr) throw new AppException('ERR_9001_VALIDATION_FAILED', insertErr.message);
    return inserted ?? [];
  }

  /**
   * API_CONTRACT.md mục 2 — GET /floors/:id/tables.
   */
  async getFloorTables(accessToken: string, floorId: string) {
    const client = accessToken ? this.supabase.forUser(accessToken) : this.supabase.admin();
    const { data, error } = await client
      .from('tables')
      .select('id, floor_id, table_code, capacity, pos_x, pos_y, width, height, shape, status, current_order_id')
      .eq('floor_id', floorId)
      .order('table_code', { ascending: true });

    if (error) throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', error.message);
    if (!data || data.length === 0) return [];

    const tableIds = data.map((t) => t.id);
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

    // Fetch active reservations for ALL tables on this floor
    const admin = this.supabase.admin();
    const { data: reservations } = await admin
      .from('reservations')
      .select('id, table_id, customer_name, customer_phone, reservation_time, reservation_code, deposit_amount, status')
      .in('table_id', tableIds)
      .in('status', ['PAID', 'PENDING'])
      .order('created_at', { ascending: false });

    const resMap = new Map<string, any>();
    if (reservations) {
      for (const r of reservations) {
        if (r.status === 'PENDING' && r.reservation_time < fifteenMinsAgo) {
          continue; // skip expired pending
        }
        if (!resMap.has(r.table_id)) {
          resMap.set(r.table_id, r);
        }
      }
    }

    return data.map((t) => {
      const res = resMap.get(t.id);
      if (res) {
        const reserveTime = new Date(res.reservation_time).getTime();
        const now = Date.now();
        // Only lock the table if the reservation is within the next 3 hours (or in the past)
        const shouldLock = reserveTime <= now + 3 * 60 * 60 * 1000;
        
        const derivedStatus = res.status === 'PAID' ? 'RESERVED' : 'PENDING_LOCK';
        return {
          ...t,
          status: shouldLock ? derivedStatus : t.status, // Don't override if > 3 hours
          customer_name: res.customer_name,
          customer_phone: res.customer_phone,
          reservation_time: res.reservation_time,
          reservation_code: res.reservation_code,
          reservation: res,
        };
      }
      
      // Auto-revert stuck PENDING_LOCK tables if they have no active pending reservation
      if (t.status === 'PENDING_LOCK') {
        return { ...t, status: 'AVAILABLE' };
      }
      return t;
    });
  }

  /** API_CONTRACT.md mục 2 — POST /tables (OWNER). */
  async createTable(accessToken: string, dto: CreateTableDto) {
    const client = this.supabase.admin();
    const tableCode = dto.table_code || (dto as any).name || 'Bàn';
    const insertPayload: Record<string, any> = {
      floor_id: dto.floor_id,
      table_code: tableCode,
      capacity: dto.capacity ?? 0,
      pos_x: dto.pos_x,
      pos_y: dto.pos_y,
      width: dto.width ?? 80,
      height: dto.height ?? 80,
      shape: dto.shape || 'rectangle',
      status: 'AVAILABLE',
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await client.from('tables').insert(insertPayload).select().single();

    if (error) throw new AppException('ERR_9001_VALIDATION_FAILED', error.message);
    return data;
  }

  /** API_CONTRACT.md mục 2 — PATCH /tables/:id (OWNER, kéo-thả Floor Editor). */
  async updateTable(accessToken: string, tableId: string, dto: UpdateTableDto) {
    const client = this.supabase.admin();
    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (dto.table_code || (dto as any).name) {
      updatePayload.table_code = dto.table_code || (dto as any).name;
    }
    if (dto.capacity !== undefined) updatePayload.capacity = dto.capacity;
    if (dto.pos_x !== undefined) updatePayload.pos_x = dto.pos_x;
    if (dto.pos_y !== undefined) updatePayload.pos_y = dto.pos_y;
    if (dto.width !== undefined) updatePayload.width = dto.width;
    if (dto.height !== undefined) updatePayload.height = dto.height;
    if (dto.shape !== undefined) updatePayload.shape = dto.shape;

    const { data, error } = await client
      .from('tables')
      .update(updatePayload)
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
    const client = this.supabase.admin();

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
    
    // Broadcast status change to clients via WebSocket
    this.realtimeGateway?.emitTableStatusChanged?.(tableId, dto.status);
    
    return data;
  }

  /** API_CONTRACT.md mục 2 — DELETE /tables/:id (OWNER). */
  async deleteTable(accessToken: string, tableId: string) {
    const client = this.supabase.admin();
    const { data, error } = await client
      .from('tables')
      .delete()
      .eq('id', tableId)
      .select()
      .maybeSingle();

    if (error) throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', error.message);
    return data ?? { id: tableId, deleted: true };
  }
}
