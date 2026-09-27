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
  ) {}

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

  async lockTable(user: AuthenticatedUser, accessToken: string, dto: LockTableDto) {
    const supabase = this.supabaseService.forUser(accessToken);
    const supabaseAdmin = this.supabaseService.admin();

    // 1. Check table status
    const { data: table, error } = await supabase
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

    // 2. Redis SET NX EX
    const redisClient = this.redisService.getClient();
    const lockKey = `lock:${user.tenant_id}:${dto.table_id}`;
    const reservationCode = 'RES_' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const depositAmount = 50000;
    const expiresAt = new Date(Date.now() + 600_000).toISOString();

    // Store user ID in lock to verify ownership later
    const locked = await redisClient.set(lockKey, user.sub, 'EX', 600, 'NX');

    if (!locked) {
      throw new AppException('ERR_2002_TABLE_LOCKED', 'Bàn đang bị khóa bởi khách khác');
    }

    // 3. Update table status
    const { error: updateError } = await supabase
      .from('tables')
      .update({ status: 'PENDING_LOCK' })
      .eq('id', dto.table_id);

    if (updateError) {
      // rollback lock
      await redisClient.del(lockKey, `reservation:${reservationCode}`);
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

    // Store reservation context mapping in Redis
    const resKey = `reservation:${reservationCode}`;
    await redisClient.set(
      resKey,
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
    );

    // Insert into reservations table
    try {
      await supabaseAdmin.from('reservations')?.insert?.({
        tenant_id: user.tenant_id,
        table_id: dto.table_id,
        customer_id: customerId,
        customer_name: customerName,
        customer_phone: customerPhone,
        reservation_code: reservationCode,
        reservation_time: new Date().toISOString(),
        deposit_amount: depositAmount,
        status: 'PENDING',
      });
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

  async generateQr(user: AuthenticatedUser, code: string) {
    const redisClient = this.redisService.getClient();
    const resDataStr = await redisClient.get(`reservation:${code}`);

    if (!resDataStr) {
      throw new AppException('ERR_3001_RESERVATION_EXPIRED', 'Reservation code không hợp lệ hoặc đã hết hạn');
    }

    const resData = JSON.parse(resDataStr);

    if (resData.user_id !== user.sub) {
      throw new AppException('ERR_1001_UNAUTHORIZED', 'Không có quyền truy cập reservation code này');
    }

    const memo = `DATBAN ${code}`;
    const qrString = `VIETQR|${code}|${resData.amount}`;
    const realQrImageUrl = `https://img.vietqr.io/image/vietcombank-9344566957-compact2.png?amount=${Math.round(resData.amount)}&addInfo=${encodeURIComponent(memo)}&accountName=${encodeURIComponent('TRAN THANH LUON')}`;

    return {
      code,
      amount: Number(resData.amount),
      expires_at: resData.expires_at,
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
      const resDataStr = await redisClient.get(`reservation:${code}`);
      if (resDataStr) {
        const resData = JSON.parse(resDataStr);

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

        // Free Redis locks
        await redisClient.del(`lock:${resData.tenant_id}:${resData.table_id}`, `reservation:${code}`);

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
        throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', 'Lỗi khởi tạo đơn hàng khi check-in');
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

  async cancelReservation(user: AuthenticatedUser, accessToken: string, code: string) {
    const redisClient = this.redisService.getClient();
    const supabaseAdmin = this.supabaseService.admin();

    // 1. Look up in reservations table
    let reservation: any = null;
    try {
      const resQuery = await supabaseAdmin
        .from('reservations')
        ?.select?.('*')
        ?.eq?.('tenant_id', user.tenant_id)
        ?.eq?.('reservation_code', code)
        ?.maybeSingle?.();
      reservation = resQuery?.data || null;
    } catch {
      // safe fallback
    }

    const resDataStr = await redisClient.get(`reservation:${code}`);
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

    // Free Redis locks
    if (tableId) {
      await redisClient.del(`lock:${user.tenant_id}:${tableId}`, `reservation:${code}`);
    } else {
      await redisClient.del(`reservation:${code}`);
    }

    // Update reservation status in DB
    if (reservation) {
      try {
        await supabaseAdmin
          .from('reservations')
          ?.update?.({
            status: 'CANCELLED',
            updated_at: new Date().toISOString(),
          })
          ?.eq?.('id', reservation.id);
      } catch {
        // safe fallback
      }
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

    return { message: 'Đã hủy giữ bàn thành công' };
  }
}
