import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.service.js';
import { RedisService } from '../../common/redis.service.js';
import { RealtimeGateway } from '../../common/realtime/realtime.gateway.js';
import { LockTableDto } from './dto/lock-table.dto.js';
import type { AuthenticatedUser } from '../../common/types/auth.types.js';
import { AppException } from '../../common/exceptions/app.exception.js';
import { MockPaymentDto } from './dto/mock-payment.dto.js';
import * as QRCode from 'qrcode';

@Injectable()
export class ReservationService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly redisService: RedisService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  async lockTable(user: AuthenticatedUser, accessToken: string, dto: LockTableDto) {
    const supabase = this.supabaseService.forUser(accessToken);

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
    
    // Store user ID in lock to verify ownership later
    const locked = await redisClient.set(lockKey, user.sub, 'EX', 600, 'NX');
    
    if (!locked) {
      throw new AppException('ERR_2002_TABLE_LOCKED', 'Bàn đang bị khóa bởi khách khác');
    }

    // Store reservation context mapping
    const resKey = `reservation:${reservationCode}`;
    await redisClient.set(resKey, JSON.stringify({
      tenant_id: user.tenant_id,
      table_id: dto.table_id,
      user_id: user.sub,
      amount: 50000 // default deposit amount
    }), 'EX', 600);

    // 3. Update table status
    const { error: updateError } = await supabase
      .from('tables')
      .update({ status: 'PENDING_LOCK' })
      .eq('id', dto.table_id);

    if (updateError) {
      // rollback lock
      await redisClient.del(lockKey, resKey);
      throw new AppException('ERR_2003_INVALID_TABLE_STATUS_TRANSITION', 'Không thể cập nhật trạng thái bàn');
    }

    return { reservation_code: reservationCode };
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

    const qrString = `VIETQR_MOCK|${code}|${resData.amount}`;
    const qrDataUrl = await QRCode.toDataURL(qrString);

    return {
      qr_string: qrString,
      qr_image: qrDataUrl,
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
        'MOCK_WEBHOOK_SECRET chưa được cấu hình trong môi trường Production'
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
            status: 'COMPLETED'
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

        // Update table
        await supabaseAdmin
          .from('tables')
          .update({ status: 'RESERVED' })
          .eq('id', resData.table_id);

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
        status: 'UNMATCHED'
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

    await supabaseAdmin
      .from('unmatched_transactions')
      .insert({
        payment_transaction_id: paymentTx.id,
        status: 'PENDING'
      });

    // Bắn realtime event unmatched_transaction_created tới Support dashboard của đúng tenant
    this.realtimeGateway.emitUnmatchedTransactionCreated(tenantId, {
      transaction_id: paymentTx.id,
      amount: dto.amount,
      raw_transfer_content: dto.raw_transfer_content,
    });

    throw new AppException('ERR_3002_PAYMENT_CONTENT_MISMATCH', 'Nội dung chuyển khoản không khớp hoặc reservation đã hết hạn');
  }

  async cancelReservation(user: AuthenticatedUser, accessToken: string, code: string) {
    const redisClient = this.redisService.getClient();
    const resDataStr = await redisClient.get(`reservation:${code}`);
    
    if (!resDataStr) {
      return { message: 'Reservation code không tồn tại hoặc đã bị hủy' };
    }
    
    const resData = JSON.parse(resDataStr);
    
    if (resData.user_id !== user.sub) {
      throw new AppException('ERR_1001_UNAUTHORIZED', 'Không có quyền hủy reservation code này');
    }

    // Free Redis locks
    await redisClient.del(`lock:${resData.tenant_id}:${resData.table_id}`, `reservation:${code}`);

    // Update table status back to AVAILABLE
    const supabase = this.supabaseService.forUser(accessToken);
    await supabase
      .from('tables')
      .update({ status: 'AVAILABLE' })
      .eq('id', resData.table_id)
      .eq('status', 'PENDING_LOCK');

    return { message: 'Đã hủy giữ bàn thành công' };
  }
}
