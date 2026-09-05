import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.service.js';
import type { AuthenticatedUser } from '../../common/types/auth.types.js';
import { AppException } from '../../common/exceptions/app.exception.js';
import { TopupDto } from './dto/topup.dto.js';

@Injectable()
export class WalletService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async getWallet(user: AuthenticatedUser, accessToken: string) {
    const supabase = this.supabaseService.forUser(accessToken);
    
    const { data: customer } = await supabase.from('customers').select('id').eq('auth_user_id', user.sub).single();
    if (!customer) throw new AppException('ERR_1001_UNAUTHORIZED', 'Customer không tồn tại');

    const { data: wallet, error } = await supabase
      .from('wallets')
      .select('id, main_balance, promo_balance, updated_at')
      .eq('customer_id', customer.id)
      .single();

    if (error || !wallet) {
      throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', 'Không tìm thấy ví');
    }
    return wallet;
  }

  async topup(user: AuthenticatedUser, accessToken: string, dto: TopupDto) {
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_MOCK_WALLET_TOPUP !== 'true') {
      throw new AppException('ERR_1002_FORBIDDEN_ROLE', 'Tính năng nạp tiền mock bị vô hiệu hóa trong môi trường Production');
    }

    const supabase = this.supabaseService.forUser(accessToken);
    const supabaseAdmin = this.supabaseService.admin();
    
    const { data: customer } = await supabase.from('customers').select('id').eq('auth_user_id', user.sub).single();
    if (!customer) throw new AppException('ERR_1001_UNAUTHORIZED', 'Customer không tồn tại');

    const { data: wallet } = await supabase.from('wallets').select('id, main_balance').eq('customer_id', customer.id).single();
    if (!wallet) throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', 'Không tìm thấy ví');

    const amount = dto.amount;
    const newBalance = Number(wallet.main_balance) + amount;
    
    // Concurrency / Race Condition check using Optimistic Locking pattern with standard UPDATE
    const { data: updatedWallet, error: updateError } = await supabaseAdmin
      .from('wallets')
      .update({ main_balance: newBalance })
      .eq('id', wallet.id)
      .eq('main_balance', wallet.main_balance)
      .select('id'); 

    if (updateError || !updatedWallet || updatedWallet.length === 0) {
      throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', 'Conflict số dư, nạp tiền thất bại');
    }

    // Insert wallet_transactions via admin client for financial integrity
    await supabaseAdmin.from('wallet_transactions').insert({
      wallet_id: wallet.id,
      type: 'TOPUP',
      balance_type: 'MAIN',
      amount: amount,
      balance_after: newBalance
    });

    // Insert audit log
    await supabaseAdmin.from('audit_logs').insert({
      tenant_id: user.tenant_id,
      actor_user_id: user.sub,
      action: 'WALLET_TOPUP',
      entity_type: 'wallets',
      entity_id: wallet.id,
      metadata: { amount, newBalance }
    });

    return { message: 'Nạp tiền thành công', main_balance: newBalance };
  }

  async getTransactions(user: AuthenticatedUser, accessToken: string, page: number = 1, limit: number = 20) {
    const supabase = this.supabaseService.forUser(accessToken);
    const { data: customer } = await supabase.from('customers').select('id').eq('auth_user_id', user.sub).single();
    if (!customer) throw new AppException('ERR_1001_UNAUTHORIZED', 'Customer không tồn tại');
    
    const { data: wallet } = await supabase.from('wallets').select('id').eq('customer_id', customer.id).single();
    if (!wallet) throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', 'Không tìm thấy ví');

    const start = (page - 1) * limit;
    const end = start + limit - 1;

    const { data, count, error } = await supabase
      .from('wallet_transactions')
      .select('*', { count: 'exact' })
      .eq('wallet_id', wallet.id)
      .order('created_at', { ascending: false })
      .range(start, end);

    if (error) {
      throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', 'Lỗi khi lấy giao dịch');
    }

    return {
      data,
      meta: { total: count, page, limit }
    };
  }

  async getVouchers(user: AuthenticatedUser, accessToken: string) {
    const supabase = this.supabaseService.forUser(accessToken);
    const { data: customer } = await supabase.from('customers').select('id').eq('auth_user_id', user.sub).single();
    if (!customer) throw new AppException('ERR_1001_UNAUTHORIZED', 'Customer không tồn tại');

    // Ưu tiên is_used = false và chưa hết hạn
    const { data, error } = await supabase
      .from('customer_vouchers')
      .select('*')
      .eq('customer_id', customer.id)
      .eq('is_used', false);
      // Supabase rest allows .or('expires_at.is.null,expires_at.gt.now') but we can just filter in memory for safety or use simple query
      
    if (error) {
      throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', 'Lỗi khi lấy voucher');
    }

    const now = new Date().getTime();
    const validVouchers = (data || []).filter(v => {
      if (!v.expires_at) return true;
      return new Date(v.expires_at).getTime() > now;
    });

    return { vouchers: validVouchers };
  }

  // Payment integration
  async payWithWallet(user: AuthenticatedUser, accessToken: string, amountToPay: number, orderId: string) {
    const supabase = this.supabaseService.forUser(accessToken);
    
    const { data: customer } = await supabase.from('customers').select('id').eq('auth_user_id', user.sub).single();
    if (!customer) throw new AppException('ERR_1001_UNAUTHORIZED', 'Customer không tồn tại');

    const { data: wallet } = await supabase.from('wallets').select('*').eq('customer_id', customer.id).single();
    if (!wallet) throw new AppException('ERR_3003_INSUFFICIENT_WALLET_BALANCE', 'Ví không khả dụng');

    const promoBalance = Number(wallet.promo_balance);
    const mainBalance = Number(wallet.main_balance);

    if (promoBalance + mainBalance < amountToPay) {
      throw new AppException('ERR_3003_INSUFFICIENT_WALLET_BALANCE', 'Số dư ví không đủ');
    }

    let remainingToPay = amountToPay;
    let promoDeducted = 0;
    let mainDeducted = 0;

    // Deduct PROMO first
    if (promoBalance > 0) {
      promoDeducted = Math.min(promoBalance, remainingToPay);
      remainingToPay -= promoDeducted;
    }

    // Deduct MAIN
    if (remainingToPay > 0) {
      mainDeducted = remainingToPay;
    }

    const newPromoBalance = promoBalance - promoDeducted;
    const newMainBalance = mainBalance - mainDeducted;

    const supabaseAdmin = this.supabaseService.admin();

    // Optimistic lock approach via supabaseAdmin to prevent RLS denial on financial table writes
    const { data: updatedWallet, error: updateError } = await supabaseAdmin
      .from('wallets')
      .update({ promo_balance: newPromoBalance, main_balance: newMainBalance })
      .eq('id', wallet.id)
      .eq('main_balance', wallet.main_balance)
      .eq('promo_balance', wallet.promo_balance)
      .select('id');

    if (updateError || !updatedWallet || updatedWallet.length === 0) {
      throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', 'Conflict số dư, thanh toán thất bại');
    }

    // Record transactions via supabaseAdmin
    if (promoDeducted > 0) {
      await supabaseAdmin.from('wallet_transactions').insert({
        wallet_id: wallet.id,
        order_id: orderId,
        type: 'PAYMENT',
        balance_type: 'PROMO',
        amount: -promoDeducted,
        balance_after: newPromoBalance
      });
    }

    if (mainDeducted > 0) {
      await supabaseAdmin.from('wallet_transactions').insert({
        wallet_id: wallet.id,
        order_id: orderId,
        type: 'PAYMENT',
        balance_type: 'MAIN',
        amount: -mainDeducted,
        balance_after: newMainBalance
      });
    }

    return true;
  }
}
