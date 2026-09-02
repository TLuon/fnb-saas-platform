import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.service.js';
import type { AuthenticatedUser } from '../../common/types/auth.types.js';
import { AppException } from '../../common/exceptions/app.exception.js';
import { SubscribeDto } from './dto/subscribe.dto.js';
import { RedeemDto } from './dto/redeem.dto.js';
import { WalletService } from '../wallet/wallet.service.js';
import { generateSecret, generate, verify } from 'otplib';

const OTPLIB_STEP = 30;

@Injectable()
export class CoffeePassService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly walletService: WalletService
  ) {}

  async getPlans(user: AuthenticatedUser, accessToken: string) {
    const supabase = this.supabaseService.forUser(accessToken);
    const { data: plans, error } = await supabase
      .from('coffee_pass_plans')
      .select('*')
      .eq('tenant_id', user.tenant_id);

    if (error) {
      throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', 'Lỗi khi lấy danh sách plans');
    }

    return { plans };
  }

  async subscribe(user: AuthenticatedUser, accessToken: string, dto: SubscribeDto) {
    const supabase = this.supabaseService.forUser(accessToken);

    // Get customer
    const { data: customer } = await supabase.from('customers').select('id').eq('auth_user_id', user.sub).single();
    if (!customer) throw new AppException('ERR_1001_UNAUTHORIZED', 'Customer không tồn tại');

    // Get plan
    const { data: plan, error: planError } = await supabase
      .from('coffee_pass_plans')
      .select('*')
      .eq('id', dto.plan_id)
      .eq('tenant_id', user.tenant_id)
      .single();

    if (planError || !plan) {
      throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', 'Plan không tồn tại');
    }

    const fakeOrderId = null as any; 
    await this.walletService.payWithWallet(user, accessToken, Number(plan.price), fakeOrderId);

    // Generate secret
    const secret = generateSecret();

    // Calculate expiry
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + plan.valid_days);

    const { data: subscription, error: subError } = await supabase
      .from('coffee_pass_subscriptions')
      .insert({
        customer_id: customer.id,
        plan_id: plan.id,
        remaining_redemptions: plan.total_redemptions,
        totp_secret: secret,
        expires_at: expiresAt.toISOString()
      })
      .select('id, remaining_redemptions, expires_at')
      .single();

    if (subError) {
      throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', 'Lỗi khi tạo subscription');
    }

    return { message: 'Đăng ký Coffee Pass thành công', subscription };
  }

  async getCurrentCode(user: AuthenticatedUser, accessToken: string, subscriptionId: string) {
    const supabase = this.supabaseService.forUser(accessToken);

    // Check ownership
    const { data: customer } = await supabase.from('customers').select('id').eq('auth_user_id', user.sub).single();
    if (!customer) throw new AppException('ERR_1001_UNAUTHORIZED', 'Customer không tồn tại');

    const { data: sub, error } = await supabase
      .from('coffee_pass_subscriptions')
      .select('totp_secret, remaining_redemptions, expires_at')
      .eq('id', subscriptionId)
      .eq('customer_id', customer.id)
      .single();

    if (error || !sub) {
      throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', 'Subscription không tồn tại');
    }

    const now = new Date();
    if (new Date(sub.expires_at) < now || sub.remaining_redemptions <= 0) {
      throw new AppException('ERR_3004_COFFEE_PASS_EXPIRED', 'Coffee Pass đã hết hạn hoặc hết lượt');
    }

    const code = await generate({ secret: sub.totp_secret });
    const epoch = Math.floor(now.getTime() / 1000);
    const timeRemaining = OTPLIB_STEP - (epoch % OTPLIB_STEP);

    return {
      code,
      expires_in: timeRemaining
    };
  }

  async redeem(user: AuthenticatedUser, accessToken: string, subscriptionId: string, dto: RedeemDto) {
    const supabase = this.supabaseService.forUser(accessToken);

    const { data: sub, error } = await supabase
      .from('coffee_pass_subscriptions')
      .select('id, totp_secret, remaining_redemptions, expires_at, customer_id')
      .eq('id', subscriptionId)
      .single();

    if (error || !sub) {
      throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', 'Subscription không tồn tại');
    }

    const now = new Date();
    if (new Date(sub.expires_at) < now || sub.remaining_redemptions <= 0) {
      throw new AppException('ERR_3004_COFFEE_PASS_EXPIRED', 'Coffee Pass đã hết hạn hoặc hết lượt');
    }

    // Verify TOTP
    const result = await verify({ token: dto.code, secret: sub.totp_secret, epochTolerance: 1 });
    if (!result.valid) {
      throw new AppException('ERR_3005_INVALID_TOTP_CODE', 'Mã xác nhận không hợp lệ hoặc đã hết hạn');
    }

    // Concurrency check: Optimistic lock on remaining_redemptions
    const { data: updatedSub, error: updateError } = await supabase
      .from('coffee_pass_subscriptions')
      .update({ remaining_redemptions: sub.remaining_redemptions - 1 })
      .eq('id', subscriptionId)
      .eq('remaining_redemptions', sub.remaining_redemptions)
      .select('id');

    if (updateError || !updatedSub || updatedSub.length === 0) {
      throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', 'Conflict, redeem thất bại. Vui lòng thử lại.');
    }

    // Audit log
    const supabaseAdmin = this.supabaseService.admin();
    await supabaseAdmin.from('audit_logs').insert({
      tenant_id: user.tenant_id,
      actor_user_id: user.sub,
      action: 'REDEEM_COFFEE_PASS',
      entity_type: 'coffee_pass_subscriptions',
      entity_id: subscriptionId,
      metadata: { remaining_redemptions: sub.remaining_redemptions - 1 }
    });

    return { message: 'Đổi mã thành công', remaining_redemptions: sub.remaining_redemptions - 1 };
  }

  async redeemForOrder(user: AuthenticatedUser, accessToken: string, subscriptionId: string, code: string, orderId: string) {
    const supabase = this.supabaseService.forUser(accessToken);

    const { data: sub, error } = await supabase
      .from('coffee_pass_subscriptions')
      .select('id, totp_secret, remaining_redemptions, expires_at, customer_id')
      .eq('id', subscriptionId)
      .single();

    if (error || !sub) {
      throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', 'Subscription không tồn tại');
    }

    const now = new Date();
    if (new Date(sub.expires_at) < now || sub.remaining_redemptions <= 0) {
      throw new AppException('ERR_3004_COFFEE_PASS_EXPIRED', 'Coffee Pass đã hết hạn hoặc hết lượt');
    }

    const result = await verify({ token: code, secret: sub.totp_secret, epochTolerance: 1 });
    if (!result.valid) {
      throw new AppException('ERR_3005_INVALID_TOTP_CODE', 'Mã xác nhận không hợp lệ hoặc đã hết hạn');
    }

    const { data: updatedSub, error: updateError } = await supabase
      .from('coffee_pass_subscriptions')
      .update({ remaining_redemptions: sub.remaining_redemptions - 1 })
      .eq('id', subscriptionId)
      .eq('remaining_redemptions', sub.remaining_redemptions)
      .select('id');

    if (updateError || !updatedSub || updatedSub.length === 0) {
      throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', 'Conflict, thanh toán Coffee Pass thất bại. Vui lòng thử lại.');
    }

    return true;
  }
}
