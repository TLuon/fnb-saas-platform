import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.service.js';
import { RedisService } from '../../common/redis.service.js';
import { RealtimeGateway } from '../../common/realtime/realtime.gateway.js';
import { LockTableDto } from './dto/lock-table.dto.js';
import type { AuthenticatedUser } from '../../common/types/auth.types.js';
import { AppException } from '../../common/exceptions/app.exception.js';
import { MockPaymentDto } from './dto/mock-payment.dto.js';
import { CheckInDto } from './dto/check-in.dto.js';
import { ListReservationsDto } from './dto/list-reservations.dto.js';
import * as QRCode from 'qrcode';

@Injectable()
export class ReservationService implements OnModuleInit {
  private readonly logger = new Logger(ReservationService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly redisService: RedisService,
    private readonly realtimeGateway: RealtimeGateway,
  ) { }

  onModuleInit() {
    // Chạy ngầm định kỳ 5 phút để hủy các bàn giữ quá 1 tiếng
    setInterval(() => {
      this.clearExpiredReservations().catch((err) =>
        this.logger.error('Lỗi khi dọn dẹp bàn giữ hết hạn', err),
      );
    }, 5 * 60 * 1000); // 5 phút
  }

  public async clearExpiredReservations() {
    const supabaseAdmin = this.supabaseService.admin();
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    // 1. Tìm các reservations status = 'PAID' quá 1 tiếng mà chưa check-in
    const { data: expiredReservations } = await supabaseAdmin
      .from('reservations')
      .select('id, table_id, reservation_code')
      .eq('status', 'PAID')
      .lt('reservation_time', oneHourAgo);

    if (expiredReservations && expiredReservations.length > 0) {
      for (const res of expiredReservations) {
        this.logger.log(`Hủy đặt bàn ${res.reservation_code} do quá 1 tiếng không check-in`);
        await supabaseAdmin
          .from('reservations')
          .update({
            status: 'CANCELLED',
            updated_at: new Date().toISOString(),
          })
          .eq('id', res.id);

        if (res.table_id) {
          await supabaseAdmin
            .from('tables')
            .update({
              status: 'AVAILABLE',
              updated_at: new Date().toISOString(),
            })
            .eq('id', res.table_id)
            .eq('status', 'RESERVED');

          this.realtimeGateway?.emitTableStatusChanged?.(res.table_id, 'AVAILABLE');
        }
      }
    }

    // 2. Tìm các bàn RESERVED quá 1 tiếng không có reservation khớp
    const { data: expiredTables, error: queryError } = await supabaseAdmin
      .from('tables')
      .select('id, tenant_id')
      .eq('status', 'RESERVED')
      .lt('updated_at', oneHourAgo);

    if (queryError || !expiredTables || expiredTables.length === 0) return;

    for (const table of expiredTables) {
      this.logger.log(`Giải phóng bàn ${table.id} do hết hạn giữ chỗ`);
      const { error: updateError } = await supabaseAdmin
        .from('tables')
        .update({ status: 'AVAILABLE', updated_at: new Date().toISOString() })
        .eq('id', table.id);

      if (!updateError) {
        this.realtimeGateway?.emitTableStatusChanged?.(table.id, 'AVAILABLE');
      }
    }
  }

  /**
   * Helper: safely execute Redis command with fallback
   */
  private async redisSafe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
    try {
      const client = this.redisService?.getClient?.();
      if (client?.status && client.status !== 'ready') {
        return fallback;
      }
      return await fn();
    } catch (err) {
      this.logger.warn(`Redis unavailable, using fallback: ${(err as Error).message}`);
      return fallback;
    }
  }

  private calculateDepositAmount(guestCount?: number): number {
    const count = Number(guestCount) || 2;
    if (count >= 8) return 200000;
    if (count > 4) return 100000;
    return 50000;
  }

  async lockTable(user: AuthenticatedUser, accessToken: string, dto: LockTableDto) {
    const supabaseAdmin = this.supabaseService.admin();

    // 1. Check table status using supabaseAdmin (bypass RLS restriction on customer table updates)
    const { data: table, error } = await supabaseAdmin
      .from('tables')
      .select('id, status')
      .eq('id', dto.table_id)
      .single();

    if (error || !table) {
      throw new AppException('ERR_2001_TABLE_NOT_FOUND', 'Bàn không tồn tại');
    }

    if (table.status !== 'AVAILABLE') {
      throw new AppException('ERR_2002_TABLE_LOCKED', 'Bàn không ở trạng thái AVAILABLE');
    }

    const redisClient = this.redisService.getClient();
    const lockKey = `lock:${user.tenant_id}:${dto.table_id}`;
    const reservationCode = 'RES_' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const guestCount = dto.guest_count || 2;
    const depositAmount = this.calculateDepositAmount(guestCount);
    const expiresAt = new Date(Date.now() + 600_000).toISOString();

    let resTime = new Date().toISOString();
    if (dto.booking_date && dto.booking_time) {
      resTime = new Date(`${dto.booking_date}T${dto.booking_time}:00`).toISOString();
    }

    // 2. Try Redis lock first, fallback to DB-only if Redis is down
    const locked = await this.redisSafe(
      () => redisClient.set(lockKey, user.sub, 'EX', 600, 'NX'),
      'OK' as string | null, // fallback: assume lock acquired
    );

    if (!locked) {
      throw new AppException('ERR_2002_TABLE_LOCKED', 'Bàn đang bị khóa bởi khách khác');
    }

    // 3. Update table status using supabaseAdmin
    const { error: updateError } = await supabaseAdmin
      .from('tables')
      .update({ status: 'PENDING_LOCK', updated_at: new Date().toISOString() })
      .eq('id', dto.table_id);

    if (updateError) {
      await this.redisSafe(() => redisClient.del(lockKey), 0);
      throw new AppException('ERR_2003_INVALID_TABLE_STATUS_TRANSITION', 'Không thể cập nhật trạng thái bàn');
    }

    // Look up customer info
    let customerName = dto.customer_name || 'Khách hàng';
    let customerPhone = dto.customer_phone || '';
    let customerId: string | null = null;

    try {
      const custRes = await supabaseAdmin
        .from('customers')
        ?.select?.('id, full_name, phone')
        ?.eq?.('auth_user_id', user.sub)
        ?.eq?.('tenant_id', user.tenant_id)
        ?.maybeSingle?.();

      if (custRes?.data) {
        if (!dto.customer_name && custRes.data.full_name) customerName = custRes.data.full_name;
        if (!dto.customer_phone && custRes.data.phone) customerPhone = custRes.data.phone;
        customerId = custRes.data.id;
      }
    } catch {
      // safe fallback
    }

    // Store reservation context in Redis (best-effort)
    await this.redisSafe(
      () => redisClient.set(
        `reservation:${reservationCode}`,
        JSON.stringify({
          tenant_id: user.tenant_id,
          table_id: dto.table_id,
          user_id: user.sub,
          customer_id: customerId,
          customer_name: customerName,
          customer_phone: customerPhone,
          amount: depositAmount,
          expires_at: expiresAt,
        }),
        'EX',
        600,
      ),
      null,
    );

    // Insert into reservations table with fallback
    const resPayloadFull: any = {
      tenant_id: user.tenant_id,
      table_id: dto.table_id,
      customer_id: customerId,
      customer_name: customerName,
      customer_phone: customerPhone,
      reservation_code: reservationCode,
      reservation_time: resTime,
      deposit_amount: depositAmount,
      status: 'PENDING',
      booking_date: dto.booking_date || null,
      booking_time: dto.booking_time || null,
      duration_hours: dto.duration_hours || 2,
      guest_count: guestCount,
      created_by_role: 'CUSTOMER',
      payment_method_deposit: 'VIETQR',
    };

    try {
      const resTable = supabaseAdmin.from('reservations');
      if (resTable && typeof resTable.insert === 'function') {
        const { error: lockInsertErr } = await resTable.insert(resPayloadFull);
        if (lockInsertErr) {
          this.logger.warn(`Full insert lockTable failed (${lockInsertErr.message}), falling back to core columns`);
          const resPayloadCore: any = {
            tenant_id: user.tenant_id,
            table_id: dto.table_id,
            customer_id: customerId,
            customer_name: customerName,
            customer_phone: customerPhone,
            reservation_code: reservationCode,
            reservation_time: resTime,
            deposit_amount: depositAmount,
            status: 'PENDING',
          };
          const { error: coreLockErr } = await resTable.insert(resPayloadCore);
          if (coreLockErr) {
            this.logger.error('Failed to insert lockTable reservation:', coreLockErr);
          }
        }
      }
    } catch {
      // safe fallback
    }

    this.realtimeGateway?.emitTableStatusChanged?.(dto.table_id, 'PENDING_LOCK');

    return {
      reservation_code: reservationCode,
      expires_at: expiresAt,
      deposit_amount: depositAmount,
    };
  }

  async staffCreateReservation(user: AuthenticatedUser, accessToken: string, dto: LockTableDto) {
    const supabaseAdmin = this.supabaseService.admin();
    const reservationCode = 'RES_' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const guestCount = dto.guest_count || 2;
    const depositAmount = this.calculateDepositAmount(guestCount);

    let resTime = new Date().toISOString();
    if (dto.booking_date && dto.booking_time) {
      resTime = new Date(`${dto.booking_date}T${dto.booking_time}:00`).toISOString();
    }

    const customerName = dto.customer_name || 'Khách qua điện thoại';
    const customerPhone = dto.customer_phone || '';
    const paymentMethod = dto.payment_method_deposit || 'CASH';

    const initialStatus = (paymentMethod === 'CASH' || paymentMethod === 'WAIVED') ? 'PAID' : 'PENDING';

    const staffPayloadFull: any = {
      tenant_id: user.tenant_id,
      table_id: dto.table_id,
      customer_name: customerName,
      customer_phone: customerPhone,
      reservation_code: reservationCode,
      reservation_time: resTime,
      deposit_amount: depositAmount,
      status: initialStatus,
      booking_date: dto.booking_date || null,
      booking_time: dto.booking_time || null,
      duration_hours: dto.duration_hours || 2,
      guest_count: guestCount,
      created_by_role: 'STAFF',
      payment_method_deposit: paymentMethod,
    };

    const { error: staffInsertErr } = await supabaseAdmin.from('reservations').insert(staffPayloadFull);
    if (staffInsertErr) {
      this.logger.warn(`Full insert staffCreateReservation failed (${staffInsertErr.message}), trying core fields`);
      const staffPayloadCore: any = {
        tenant_id: user.tenant_id,
        table_id: dto.table_id,
        customer_name: customerName,
        customer_phone: customerPhone,
        reservation_code: reservationCode,
        reservation_time: resTime,
        deposit_amount: depositAmount,
        status: initialStatus,
      };
      const { error: coreStaffErr } = await supabaseAdmin.from('reservations').insert(staffPayloadCore);
      if (coreStaffErr) {
        this.logger.error('Failed to insert staff reservation into DB:', coreStaffErr);
        throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', `Lỗi lưu đơn đặt bàn: ${coreStaffErr.message}`);
      }
    }

    const reserveTimeEpoch = new Date(resTime).getTime();
    const now = Date.now();
    const shouldLock = reserveTimeEpoch <= now + 3 * 60 * 60 * 1000;
    
    let tableStatus = 'AVAILABLE'; // Default fallback, but we should probably fetch current status.
    // Wait, it's better to just not update the table if shouldLock is false!
    if (shouldLock) {
      tableStatus = initialStatus === 'PAID' ? 'RESERVED' : 'PENDING_LOCK';

      const { error: updateTableErr } = await supabaseAdmin
        .from('tables')
        .update({ status: tableStatus, updated_at: new Date().toISOString() })
        .eq('id', dto.table_id);

      if (updateTableErr) {
        this.logger.error('Failed to update table status:', updateTableErr);
        throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', `Lỗi cập nhật trạng thái bàn: ${updateTableErr.message}`);
      }

      this.realtimeGateway?.emitTableStatusChanged?.(dto.table_id, tableStatus);
    }

    return {
      reservation_code: reservationCode,
      table_id: dto.table_id,
      customer_name: customerName,
      customer_phone: customerPhone,
      deposit_amount: depositAmount,
      status: initialStatus,
      table_status: tableStatus,
      message: 'Đã tạo giữ bàn thành công cho khách',
    };
  }

  async generateQr(user: AuthenticatedUser, code: string) {
    const redisClient = this.redisService.getClient();
    const resDataStr = await this.redisSafe(() => redisClient.get(`reservation:${code}`), null as string | null);

    let amount = 50000;
    let expiresAt = new Date(Date.now() + 600_000).toISOString();

    if (resDataStr) {
      const resData = JSON.parse(resDataStr);
      if (resData.user_id && resData.user_id !== user.sub) {
        throw new AppException('ERR_1001_UNAUTHORIZED', 'Không có quyền truy cập reservation code này');
      }
      amount = Number(resData.amount || 50000);
      expiresAt = resData.expires_at || expiresAt;
    } else {
      // Fallback: check in DB table reservations
      const supabaseAdmin = this.supabaseService.admin();
      let resDb: any = null;
      try {
        const resTable = supabaseAdmin.from('reservations');
        if (resTable && typeof resTable.select === 'function') {
          const { data } = await resTable
            .select('*')
            .eq('tenant_id', user.tenant_id)
            .eq('reservation_code', code)
            .maybeSingle();
          resDb = data;
        }
      } catch {
        resDb = null;
      }

      if (resDb) {
        amount = Number(resDb.deposit_amount || 50000);
        expiresAt = resDb.reservation_time ? new Date(new Date(resDb.reservation_time).getTime() + 600_000).toISOString() : expiresAt;
      } else {
        throw new AppException('ERR_3001_RESERVATION_EXPIRED', 'Mã giữ bàn không tồn tại hoặc đã hết hạn');
      }
    }

    const memo = `DATBAN ${code}`;
    const qrString = `VIETQR|${code}|${amount}`;
    const realQrImageUrl = `https://img.vietqr.io/image/vietcombank-9344566957-compact2.png?amount=${Math.round(amount)}&addInfo=${encodeURIComponent(memo)}&accountName=${encodeURIComponent('TRAN THANH LUON')}`;

    return {
      code,
      amount,
      expires_at: expiresAt,
      qr_string: qrString,
      qr_image: realQrImageUrl,
    };
  }

  async processMockPayment(tenantId: string, dto: MockPaymentDto, secret?: string) {
    const supabaseAdmin = this.supabaseService.admin();
    const redisClient = this.redisService.getClient();

    // ── Bước 0: Validate Webhook Secret (NEW-003: Fail closed in production) ──
    const isProd = process.env.NODE_ENV === 'production';
    const configuredSecret = process.env.MOCK_WEBHOOK_SECRET;

    if (isProd && !configuredSecret) {
      throw new AppException(
        'ERR_9002_INTERNAL_SERVER_ERROR',
        'MOCK_WEBHOOK_SECRET chưa được cấu hình trong môi trường Production',
      );
    }

    const expectedSecret = configuredSecret || (isProd ? null : 'dev-mock-secret-key-12345');

    if (!secret || secret !== expectedSecret) {
      throw new AppException('ERR_1001_UNAUTHORIZED', 'Webhook secret không hợp lệ hoặc bị thiếu');
    }

    // ── Bước 1: Validate tenant tồn tại ────────────────────────────────────
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .select('id')
      .eq('id', tenantId)
      .single();

    if (tenantError || !tenant) {
      throw new AppException('ERR_1003_TENANT_MISMATCH', 'Tenant không tồn tại hoặc tenantId không hợp lệ');
    }

    // ── Bước 2: Idempotency Check — tránh duplicate webhook xử lý nhiều lần ──
    const { data: existingCompletedTx } = await supabaseAdmin
      .from('payment_transactions')
      .select('id, status, reservation_code')
      .eq('tenant_id', tenantId)
      .eq('raw_transfer_content', dto.raw_transfer_content)
      .eq('status', 'COMPLETED')
      .maybeSingle();

    if (existingCompletedTx) {
      return {
        message: 'Giao dịch đã được xử lý trước đó',
        payment_transaction_id: existingCompletedTx.id,
        idempotent: true,
      };
    }

    // ── Bước 3: Extract RES_XXXXXX từ nội dung chuyển khoản ────────────────
    const match = dto.raw_transfer_content.match(/RES_[A-Z0-9]+/);
    const code = match ? match[0] : null;

    if (code) {
      let resData: any = null;
      const resDataStr = await this.redisSafe(() => redisClient.get(`reservation:${code}`), null as string | null);
      if (resDataStr) {
        try {
          resData = JSON.parse(resDataStr);
        } catch {
          resData = null;
        }
      }

      if (!resData) {
        let resDb: any = null;
        try {
          const resTable = supabaseAdmin.from('reservations');
          if (resTable && typeof resTable.select === 'function') {
            const { data } = await resTable
              .select('*')
              .eq('reservation_code', code)
              .maybeSingle();
            resDb = data;
          }
        } catch {
          resDb = null;
        }

        if (resDb) {
          resData = {
            tenant_id: resDb.tenant_id,
            table_id: resDb.table_id,
            customer_id: resDb.customer_id,
            customer_name: resDb.customer_name,
            customer_phone: resDb.customer_phone,
            amount: resDb.deposit_amount,
          };
        }
      }

      if (resData) {
        // Đảm bảo reservation thuộc đúng tenant được gửi trong route param
        if (resData.tenant_id !== tenantId) {
          throw new AppException('ERR_1003_TENANT_MISMATCH', 'tenantId không khớp với reservation');
        }

        // Valid payment match
        const { data: paymentTx, error: txError } = await supabaseAdmin
          .from('payment_transactions')
          .insert({
            tenant_id: resData.tenant_id,
            reservation_code: code,
            amount: dto.amount,
            raw_transfer_content: dto.raw_transfer_content,
            status: 'COMPLETED',
          })
          .select('id')
          .single();

        if (txError) {
          // Xử lý race condition đồng thời: nếu dính unique index 23505, query lại record đã insert
          if ((txError as any).code === '23505') {
            const { data: raceCompletedTx } = await supabaseAdmin
              .from('payment_transactions')
              .select('id')
              .eq('tenant_id', resData.tenant_id)
              .eq('reservation_code', code)
              .eq('status', 'COMPLETED')
              .maybeSingle();

            return {
              message: 'Giao dịch đã được xử lý trước đó',
              payment_transaction_id: raceCompletedTx?.id,
              idempotent: true,
            };
          }
          throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', 'Lỗi lưu giao dịch thanh toán');
        }

        // Update or insert into reservations table
        try {
          const resUpdate = await supabaseAdmin
            .from('reservations')
            ?.update?.({
              status: 'PAID',
              updated_at: new Date().toISOString(),
            })
            ?.eq?.('reservation_code', code)
            ?.select?.();

          if (!resUpdate?.data || resUpdate.data.length === 0) {
            await supabaseAdmin.from('reservations')?.insert?.({
              tenant_id: resData.tenant_id,
              table_id: resData.table_id,
              customer_id: resData.customer_id || null,
              customer_name: resData.customer_name || 'Khách hàng',
              customer_phone: resData.customer_phone || '',
              reservation_code: code,
              reservation_time: new Date().toISOString(),
              deposit_amount: dto.amount || resData.amount || 50000,
              status: 'PAID',
            });
          }
        } catch {
          // safe fallback
        }

        // Update table
        await supabaseAdmin
          .from('tables')
          .update({ status: 'RESERVED' })
          .eq('id', resData.table_id);

        this.realtimeGateway?.emitTableStatusChanged?.(resData.table_id, 'RESERVED');

        // Free Redis locks (safe)
        await this.redisSafe(
          () => redisClient.del(`lock:${resData.tenant_id}:${resData.table_id}`, `reservation:${code}`),
          0,
        );

        return { message: 'Thanh toán thành công, bàn đã được giữ', payment_transaction_id: paymentTx.id };
      }
    }

    // ── Bước 4: Unmatched payment ──────────────────────────────────────────
    const { data: existingUnmatchedTx } = await supabaseAdmin
      .from('payment_transactions')
      .select('id, status')
      .eq('tenant_id', tenantId)
      .eq('raw_transfer_content', dto.raw_transfer_content)
      .eq('status', 'UNMATCHED')
      .maybeSingle();

    if (existingUnmatchedTx) {
      return {
        message: 'Giao dịch không khớp đã được ghi nhận trước đó',
        payment_transaction_id: existingUnmatchedTx.id,
        idempotent: true,
      };
    }

    const { data: paymentTx, error: txError } = await supabaseAdmin
      .from('payment_transactions')
      .insert({
        tenant_id: tenantId,
        amount: dto.amount,
        raw_transfer_content: dto.raw_transfer_content,
        status: 'UNMATCHED',
      })
      .select('id')
      .single();

    if (txError) {
      if ((txError as any).code === '23505') {
        const { data: raceUnmatchedTx } = await supabaseAdmin
          .from('payment_transactions')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('raw_transfer_content', dto.raw_transfer_content)
          .eq('status', 'UNMATCHED')
          .maybeSingle();

        return {
          message: 'Giao dịch không khớp đã được ghi nhận trước đó',
          payment_transaction_id: raceUnmatchedTx?.id,
          idempotent: true,
        };
      }
      throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', 'Lỗi lưu giao dịch thanh toán');
    }

    await supabaseAdmin.from('unmatched_transactions').insert({
      payment_transaction_id: paymentTx.id,
      status: 'PENDING',
    });

    // Bắn realtime event unmatched_transaction_created tới Support dashboard của đúng tenant
    this.realtimeGateway?.emitUnmatchedTransactionCreated?.(tenantId, {
      transaction_id: paymentTx.id,
      amount: dto.amount,
      raw_transfer_content: dto.raw_transfer_content,
    });

    throw new AppException(
      'ERR_3002_PAYMENT_CONTENT_MISMATCH',
      'Nội dung chuyển khoản không khớp hoặc reservation đã hết hạn',
    );
  }

  /**
   * Manual deposit confirmation (Staff/Owner)
   */
  async confirmDeposit(user: AuthenticatedUser, code: string) {
    const supabaseAdmin = this.supabaseService.admin();
    const redisClient = this.redisService.getClient();

    // 1. Fetch reservation
    const { data: res } = await supabaseAdmin
      .from('reservations')
      .select('*')
      .eq('reservation_code', code)
      .eq('tenant_id', user.tenant_id)
      .maybeSingle();

    if (!res) throw new AppException('ERR_404', 'Không tìm thấy đặt bàn');
    if (res.status !== 'PENDING' && res.status !== 'PAID') throw new AppException('ERR_400', 'Đặt bàn không ở trạng thái chờ cọc');

    // 2. Update reservation to PAID
    await supabaseAdmin
      .from('reservations')
      .update({ status: 'PAID', updated_at: new Date().toISOString() })
      .eq('reservation_code', code);

    // 3. Update table to RESERVED only if within 3 hours
    const reserveTimeEpoch = new Date(res.reservation_time).getTime();
    const now = Date.now();
    const shouldLock = reserveTimeEpoch <= now + 3 * 60 * 60 * 1000;
    
    if (shouldLock) {
      await supabaseAdmin
        .from('tables')
        .update({ status: 'RESERVED' })
        .eq('id', res.table_id);
    }

    // 4. Free Redis locks (best-effort)
    await this.redisSafe(
      () => redisClient.del(`lock:${res.tenant_id}:${res.table_id}`, `reservation:${code}`),
      0,
    );

    // 5. Notify clients — table status + customer notification
    if (shouldLock) {
      this.realtimeGateway?.emitTableStatusChanged?.(res.table_id, 'RESERVED');
    }

    // 6. Record the deposit as a transaction (order)
    const depositAmount = Number(res.deposit_amount || 0);
    if (depositAmount > 0) {
      // Find branch_id for the table
      let branchId = user.branch_id;
      if (!branchId) {
        const { data: tableData } = await supabaseAdmin
          .from('tables')
          .select('floor_id, floors(branch_id)')
          .eq('id', res.table_id)
          .single();
        branchId = (tableData?.floors as any)?.branch_id || user.branch_id;
      }

      // Find active shift
      let shiftId = null;
      if (branchId) {
        const { data: shiftData } = await supabaseAdmin
          .from('shifts')
          .select('id')
          .eq('branch_id', branchId)
          .eq('status', 'OPEN')
          .maybeSingle();
        shiftId = shiftData?.id || null;
      }

      const orderCode = 'DEP_' + code.substring(0, 6) + Math.random().toString(36).substring(2, 4).toUpperCase();
      
      await supabaseAdmin.from('orders').insert({
        tenant_id: user.tenant_id,
        branch_id: branchId,
        shift_id: shiftId,
        table_id: res.table_id,
        customer_id: res.customer_id,
        order_code: orderCode,
        order_type: 'DINE_IN',
        status: 'COMPLETED',
        subtotal: depositAmount,
        final_amount: depositAmount,
        payment_method: 'TRANSFER', // Deposits are typically transfer
        created_by: user.sub,
        notes: `Thu tiền cọc đặt bàn #${code}`
      });
    }

    const confirmPayload = {
      status: 'PAID',
      type: 'DEPOSIT_CONFIRMED',
      reservation_code: code,
      message: 'Cửa hàng đã xác nhận cọc! Đặt bàn của bạn đã thành công.',
    };

    // Removed global broadcast to prevent unrelated customers from being notified

    if (res.customer_id) {
      let authUserId: string | null = null;
      try {
        const { data: custRecord } = await supabaseAdmin
          .from('customers')
          .select('auth_user_id')
          .eq('id', res.customer_id)
          .maybeSingle();
        authUserId = custRecord?.auth_user_id || null;
      } catch {
        // safe fallback
      }

      const notifyTarget = authUserId || res.customer_id;
      this.realtimeGateway?.emitOrderStatusChanged(code, notifyTarget, confirmPayload);
    }

    return { message: 'Đã xác nhận cọc, giữ bàn thành công' };
  }

  /**
   * Staff Check-in API:
   * 1. Xác thực thông tin khách (mã code, table_id, hoặc số điện thoại)
   * 2. Đổi trạng thái bàn thành OCCUPIED
   * 3. Đổi trạng thái reservations thành CHECKED_IN
   * 4. Tự động khởi tạo order DINE_IN gán vào current_order_id của bàn
   */
  async checkIn(user: AuthenticatedUser, code?: string, dto?: CheckInDto) {
    const supabaseAdmin = this.supabaseService.admin();
    const targetCode = code || dto?.reservation_code;
    const targetTableId = dto?.table_id;
    const targetPhone = dto?.phone;

    let query = supabaseAdmin
      .from('reservations')
      .select('*')
      .eq('tenant_id', user.tenant_id);

    if (targetCode) {
      query = query.eq('reservation_code', targetCode);
    } else if (targetTableId) {
      query = query.eq('table_id', targetTableId).eq('status', 'PAID');
    } else if (targetPhone) {
      query = query.eq('customer_phone', targetPhone).eq('status', 'PAID');
    } else {
      throw new AppException(
        'ERR_9001_VALIDATION_FAILED',
        'Vui lòng cung cấp mã đặt bàn, ID bàn hoặc số điện thoại',
      );
    }

    const { data: reservation, error: resError } = await query
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (resError || !reservation) {
      throw new AppException('ERR_3001_RESERVATION_EXPIRED', 'Không tìm thấy thông tin đặt bàn');
    }

    if (reservation.status === 'CHECKED_IN') {
      return {
        message: 'Bàn đã được check-in trước đó',
        reservation,
      };
    }

    if (reservation.status !== 'PAID' && reservation.status !== 'PENDING') {
      throw new AppException(
        'ERR_3001_RESERVATION_EXPIRED',
        `Đặt bàn đang ở trạng thái ${reservation.status}, không thể check-in`,
      );
    }

    // 1. Fetch table details
    const { data: table, error: tableError } = await supabaseAdmin
      .from('tables')
      .select('id, floor_id, status, current_order_id')
      .eq('id', reservation.table_id)
      .single();

    if (tableError || !table) {
      throw new AppException('ERR_2001_TABLE_NOT_FOUND', 'Bàn không tồn tại');
    }

    // 2. Fetch branch_id from floor
    let branchId = user.branch_id;
    if (!branchId && table.floor_id) {
      const { data: floor } = await supabaseAdmin
        .from('floors')
        .select('branch_id')
        .eq('id', table.floor_id)
        .single();
      branchId = floor?.branch_id;
    }

    // 3. Create or reuse active order
    let order: any = null;
    if (table.current_order_id) {
      const { data: existingOrder } = await supabaseAdmin
        .from('orders')
        .select('*')
        .eq('id', table.current_order_id)
        .maybeSingle();
      order = existingOrder;
    }

    if (!order) {
      const orderCode = 'ORD_' + Math.random().toString(36).substring(2, 8).toUpperCase();
      const depositAmount = Number(reservation.deposit_amount || 0);

      const { data: newOrder, error: createOrderError } = await supabaseAdmin
        .from('orders')
        .insert({
          tenant_id: user.tenant_id,
          branch_id: branchId,
          table_id: table.id,
          customer_id: reservation.customer_id,
          order_code: orderCode,
          order_type: 'DINE_IN',
          status: 'PENDING',
          subtotal: 0,
          discount_amount: depositAmount,
          final_amount: 0,
        })
        .select()
        .single();

      if (createOrderError) {
        console.error('CREATE_ORDER_ERROR_CHECK_IN', createOrderError);
        throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', 'Lỗi khởi tạo đơn hàng khi check-in: ' + createOrderError.message);
      }
      order = newOrder;

      // Update table status to OCCUPIED and assign current_order_id
      await supabaseAdmin
        .from('tables')
        .update({
          status: 'OCCUPIED',
          current_order_id: newOrder.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', table.id);
    } else {
      // Table already had order, update table status to OCCUPIED
      await supabaseAdmin
        .from('tables')
        .update({
          status: 'OCCUPIED',
          updated_at: new Date().toISOString(),
        })
        .eq('id', table.id);
    }

    // 4. Update reservation status to CHECKED_IN
    await supabaseAdmin
      .from('reservations')
      .update({
        status: 'CHECKED_IN',
        updated_at: new Date().toISOString(),
      })
      .eq('id', reservation.id);

    // 5. Emit table status changed
    this.realtimeGateway?.emitTableStatusChanged?.(table.id, 'OCCUPIED');

    return {
      message: 'Check-in thành công',
      reservation: {
        ...reservation,
        status: 'CHECKED_IN',
      },
      order,
    };
  }

  /**
   * Danh sách đặt bàn cho STAFF / OWNER
   */
  async listReservations(user: AuthenticatedUser, query: ListReservationsDto) {
    const supabaseAdmin = this.supabaseService.admin();
    let q = supabaseAdmin
      .from('reservations')
      .select('*')
      .eq('tenant_id', user.tenant_id);

    if (query.status) {
      q = q.eq('status', query.status);
      if (query.status === 'PENDING') {
        const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
        q = q.gte('reservation_time', fifteenMinsAgo);
      }
    }
    if (query.table_id) {
      q = q.eq('table_id', query.table_id);
    }
    if (query.date) {
      q = q
        .gte('reservation_time', `${query.date}T00:00:00.000Z`)
        .lte('reservation_time', `${query.date}T23:59:59.999Z`);
    }

    const { data, error } = await q.order('reservation_time', { ascending: false });
    console.log('listReservations QUERY RESULT', { data, error });
    if (error) {
      throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', error.message);
    }
    return data ?? [];
  }

  /**
   * Danh sách đặt bàn của khách hàng hiện tại
   */
  async getMyReservations(user: AuthenticatedUser) {
    const supabaseAdmin = this.supabaseService.admin();

    const { data: customers, error: custErr } = await supabaseAdmin
      .from('customers')
      .select('id, phone')
      .eq('auth_user_id', user.sub);

    if (custErr) throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', custErr.message);
    
    const customerIds = customers?.map(c => c.id).filter(Boolean) || [];
    const customerPhones = customers?.map(c => c.phone).filter(Boolean) || [];
    
    // Fallback: Check if we have their phone directly from user object
    if ((user as any).phone && !customerPhones.includes((user as any).phone)) {
       customerPhones.push((user as any).phone);
    }

    if (customerIds.length === 0 && customerPhones.length === 0) return [];

    let query = supabaseAdmin
      .from('reservations')
      .select(`
        *,
        table:tables(table_code, name, floor:floors(name)),
        tenant:tenants(name)
      `)
      .order('created_at', { ascending: false });

    // Build the correct OR condition
    if (customerIds.length > 0 && customerPhones.length > 0) {
      query = query.or(`customer_id.in.(${customerIds.join(',')}),customer_phone.in.(${customerPhones.map(p => `"${p}"`).join(',')})`);
    } else if (customerIds.length > 0) {
      query = query.in('customer_id', customerIds);
    } else if (customerPhones.length > 0) {
      query = query.in('customer_phone', customerPhones);
    } else {
      return [];
    }

    const { data, error } = await query;

    if (error) {
      throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', error.message);
    }
    return data ?? [];
  }

  /**
   * Chi tiết đặt bàn theo reservation_code
   */
  async getReservation(user: AuthenticatedUser, code: string) {
    const supabaseAdmin = this.supabaseService.admin();
    const { data: reservation, error } = await supabaseAdmin
      .from('reservations')
      .select('*')
      .eq('tenant_id', user.tenant_id)
      .eq('reservation_code', code)
      .maybeSingle();

    if (error) {
      throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', error.message);
    }
    if (!reservation) {
      throw new AppException('ERR_3001_RESERVATION_EXPIRED', 'Không tìm thấy đặt bàn');
    }

    if (user.role_app === 'CUSTOMER') {
      const { data: customer } = await supabaseAdmin
        .from('customers')
        .select('id')
        .eq('auth_user_id', user.sub)
        .eq('tenant_id', user.tenant_id)
        .maybeSingle();

      if (reservation.customer_id && customer && reservation.customer_id !== customer.id) {
        throw new AppException('ERR_1001_UNAUTHORIZED', 'Không có quyền xem thông tin đặt bàn này');
      }
    }

    return reservation;
  }

  async cancelReservation(user: AuthenticatedUser, accessToken: string, code: string, reason?: string) {
    const redisClient = this.redisService.getClient();
    const supabaseAdmin = this.supabaseService.admin();

    // 1. Look up in reservations table
    let reservation: any = null;
    try {
      const resQuery = await supabaseAdmin
        .from('reservations')
        .select('*')
        .eq('reservation_code', code)
        .maybeSingle();
      reservation = resQuery?.data || null;
    } catch {
      // safe fallback
    }

    const resDataStr = await this.redisSafe(() => redisClient.get(`reservation:${code}`), null);
    const redisResData = resDataStr ? JSON.parse(resDataStr) : null;

    if (!reservation && !redisResData) {
      return { message: 'Reservation code không tồn tại hoặc đã bị hủy' };
    }

    // Verify ownership if CUSTOMER
    if (user.role_app === 'CUSTOMER') {
      if (redisResData && redisResData.user_id !== user.sub) {
        throw new AppException('ERR_1001_UNAUTHORIZED', 'Không có quyền hủy reservation code này');
      }
      if (reservation?.customer_id) {
        try {
          const custQuery = await supabaseAdmin
            .from('customers')
            ?.select?.('id')
            ?.eq?.('auth_user_id', user.sub)
            ?.eq?.('tenant_id', user.tenant_id)
            ?.maybeSingle?.();
          const customer = custQuery?.data;
          if (customer && reservation.customer_id !== customer.id) {
            throw new AppException('ERR_1001_UNAUTHORIZED', 'Không có quyền hủy reservation code này');
          }
        } catch {
          // safe fallback
        }
      }
    }

    const tableId = reservation?.table_id || redisResData?.table_id;

    // Free Redis locks (best-effort)
    if (tableId) {
      await this.redisSafe(() => redisClient.del(`lock:${user.tenant_id}:${tableId}`, `reservation:${code}`), 0);
    } else {
      await this.redisSafe(() => redisClient.del(`reservation:${code}`), 0);
    }

    // Update reservation status in DB
    try {
      const updatePayload: any = {
        status: 'CANCELLED',
        updated_at: new Date().toISOString(),
      };
      const resTable = supabaseAdmin.from('reservations');
      if (resTable && typeof resTable.update === 'function') {
        const { error: updateErr } = await resTable
          .update(updatePayload)
          .eq('reservation_code', code);

        if (updateErr) {
          this.logger.error('Error updating reservation cancellation in DB:', updateErr);
        }
      }
    } catch (err) {
      this.logger.error('Failed to update reservation status to CANCELLED:', err);
    }

    // Revert table status to AVAILABLE
    if (tableId) {
      try {
        await supabaseAdmin
          .from('tables')
          ?.update?.({ status: 'AVAILABLE' })
          ?.eq?.('id', tableId);

        this.realtimeGateway?.emitTableStatusChanged?.(tableId, 'AVAILABLE');
      } catch {
        // safe fallback
      }
    }

    // Emit order_status_changed event to customer & broadcast
    const cancelPayload = {
      status: 'CANCELLED',
      reservation_code: code,
      reason: reason || 'Nhân viên đã hủy giữ bàn',
      message: `Đặt bàn ${code} đã bị hủy. Lý do: ${reason || 'Nhân viên hủy'}`,
    };

    // Broadcast removed to prevent notifying unrelated customers.
    // Specific customer notification will be handled below.
    if (reservation?.customer_id) {
      let authUserId: string | null = null;
      try {
        const { data: custRecord } = await supabaseAdmin
          .from('customers')
          .select('auth_user_id')
          .eq('id', reservation.customer_id)
          .maybeSingle();
        authUserId = custRecord?.auth_user_id || null;
      } catch {
        // safe fallback
      }

      const notifyTarget = authUserId || reservation.customer_id;
      this.realtimeGateway?.emitOrderStatusChanged(code, notifyTarget, cancelPayload);
    }

    return { message: 'Đã hủy giữ bàn thành công', reason };
  }
}
