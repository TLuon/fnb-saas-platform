import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.service.js';
import { RedisService } from '../../common/redis.service.js';
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

  async processMockPayment(dto: MockPaymentDto) {
    // Extract RES_XXXXXX from transfer content
    const match = dto.raw_transfer_content.match(/RES_[A-Z0-9]+/);
    const code = match ? match[0] : null;
    
    const supabaseAdmin = this.supabaseService.admin();
    const redisClient = this.redisService.getClient();

    if (code) {
      const resDataStr = await redisClient.get(`reservation:${code}`);
      if (resDataStr) {
        const resData = JSON.parse(resDataStr);
        
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
          throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', 'Lỗi lưu giao dịch thanh toán');
        }

        // Update table
        await supabaseAdmin
          .from('tables')
          .update({ status: 'RESERVED' })
          .eq('id', resData.table_id);

        // Free Redis locks
        await redisClient.del(`lock:${resData.tenant_id}:${resData.table_id}`, `reservation:${code}`);

        // Realtime event table_status_changed is handled by Supabase Realtime automatically on UPDATE

        return { message: 'Thanh toán thành công, bàn đã được giữ', payment_transaction_id: paymentTx.id };
      }
    }

    // Unmatched payment
    const { data: paymentTx, error: txError } = await supabaseAdmin
      .from('payment_transactions')
      .insert({
        amount: dto.amount,
        raw_transfer_content: dto.raw_transfer_content,
        status: 'UNMATCHED'
      })
      .select('id')
      .single();

    if (txError) {
      throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', 'Lỗi lưu giao dịch thanh toán');
    }

    await supabaseAdmin
      .from('unmatched_transactions')
      .insert({
        payment_transaction_id: paymentTx.id,
        status: 'PENDING'
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
