import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.service.js';
import type { AuthenticatedUser } from '../../common/types/auth.types.js';
import { AppException } from '../../common/exceptions/app.exception.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { AddOrderItemDto } from './dto/add-order-item.dto.js';
import { UpdateOrderItemDto } from './dto/update-order-item.dto.js';
import { UpdateKitchenStatusDto } from './dto/update-kitchen-status.dto.js';
import { PayOrderDto } from './dto/pay-order.dto.js';
import { RealtimeGateway } from '../../common/realtime/realtime.gateway.js';
import { WalletService } from '../wallet/wallet.service.js';
import { CoffeePassService } from '../coffee-pass/coffee-pass.service.js';

@Injectable()
export class OrderService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly realtimeGateway: RealtimeGateway,
    private readonly walletService: WalletService,
    private readonly coffeePassService: CoffeePassService
  ) {}

  private async calculateOrderSubtotal(supabase: any, orderId: string) {
    const { data: items, error } = await supabase
      .from('order_items')
      .select('quantity, unit_price')
      .eq('order_id', orderId);
      
    if (error) return;

    const subtotal = items.reduce((sum: number, item: any) => sum + (item.quantity * item.unit_price), 0);

    const { data: order } = await supabase
      .from('orders')
      .select('discount_amount')
      .eq('id', orderId)
      .maybeSingle();

    const discount = order?.discount_amount ? Number(order.discount_amount) : 0;
    const finalAmount = Math.max(0, subtotal - discount);

    await supabase
      .from('orders')
      .update({ subtotal, final_amount: finalAmount })
      .eq('id', orderId);
  }

  async createOrder(user: AuthenticatedUser, _accessToken: string, dto: CreateOrderDto) {
    // NEW-007 FIX: Gọi atomic RPC fn_create_order (migration 007)
    // Toàn bộ logic kiểm tra bàn, khóa dòng FOR UPDATE, kiểm tra và khấu trừ cọc,
    // tạo order và cập nhật bàn OCCUPIED diễn ra trong 1 transaction duy nhất,
    // chống double-credit và double-seating tuyệt đối dưới tải cao
    const orderCode = 'ORD-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const supabaseAdmin = this.supabaseService.admin();

    const { data: result, error: rpcError } = await supabaseAdmin.rpc('fn_create_order', {
      p_tenant_id:        user.tenant_id,
      p_branch_id:        user.branch_id,
      p_table_id:         dto.table_id,
      p_order_code:       orderCode,
      p_reservation_code: dto.reservation_code || null,
    });

    if (rpcError) {
      throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', `Lỗi khi tạo order: ${rpcError.message}`);
    }

    const rpcResult = result as {
      success: boolean;
      error_code?: string;
      message?: string;
      order_id?: string;
      order_code?: string;
      deposit_applied?: number;
    };

    if (!rpcResult?.success) {
      const errCode = (rpcResult?.error_code ?? 'ERR_9002_INTERNAL_SERVER_ERROR') as import('../../common/constants/error-codes.js').ErrorCode;
      const errMsg  = rpcResult?.message ?? 'Tạo order thất bại';
      throw new AppException(errCode, errMsg);
    }

    return {
      order_id: rpcResult.order_id,
      order_code: rpcResult.order_code,
      deposit_applied: rpcResult.deposit_applied ?? 0,
    };
  }

  async addOrderItem(user: AuthenticatedUser, accessToken: string, orderId: string, dto: AddOrderItemDto) {
    const supabase = this.supabaseService.forUser(accessToken);

    // 1. Check order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, status')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      throw new AppException('ERR_4001_ORDER_NOT_FOUND', 'Order không tồn tại');
    }

    if (order.status === 'COMPLETED' || order.status === 'CANCELLED') {
      throw new AppException('ERR_4002_ORDER_ALREADY_COMPLETED', 'Order đã đóng, không thể thêm món');
    }

    // 2. Check product
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name, price, is_active')
      .eq('id', dto.product_id)
      .single();

    if (productError || !product || !product.is_active) {
      throw new AppException('ERR_7002_PRODUCT_NOT_FOUND', 'Sản phẩm không khả dụng');
    }

    // 3. Add item
    const { error: insertError } = await supabase
      .from('order_items')
      .insert({
        order_id: orderId,
        product_id: product.id,
        product_name: product.name,
        quantity: dto.quantity,
        unit_price: product.price,
        modifiers: dto.modifiers || [],
        kitchen_status: 'QUEUED',
        // added_by_customer_id: phải là customers.id, không phải auth.users.id (sub)
        // RLS sẽ lọc đúng qua forUser() nên không cần set thêm nếu customer chưa được resolve
        added_by_customer_id: null
      });

    if (insertError) {
      throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', 'Lỗi khi thêm món');
    }

    await this.calculateOrderSubtotal(supabase, orderId);

    return { message: 'Đã thêm món vào order' };
  }

  async updateOrderItem(user: AuthenticatedUser, accessToken: string, orderId: string, itemId: string, dto: UpdateOrderItemDto) {
    const supabase = this.supabaseService.forUser(accessToken);

    // 1. Check order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, status')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      throw new AppException('ERR_4001_ORDER_NOT_FOUND', 'Order không tồn tại');
    }

    if (order.status === 'COMPLETED' || order.status === 'CANCELLED') {
      throw new AppException('ERR_4002_ORDER_ALREADY_COMPLETED', 'Order đã đóng, không thể sửa món');
    }

    // 2. Check item
    const { data: item, error: itemError } = await supabase
      .from('order_items')
      .select('id, kitchen_status')
      .eq('id', itemId)
      .eq('order_id', orderId)
      .single();

    if (itemError || !item) {
      throw new AppException('ERR_9001_VALIDATION_FAILED', 'Item không tồn tại trong order này');
    }

    // Only allow updating if not PREPARING/READY/SERVED
    if (item.kitchen_status !== 'QUEUED') {
      throw new AppException('ERR_9001_VALIDATION_FAILED', 'Món đang được chế biến, không thể sửa');
    }

    const updates: any = {};
    if (dto.quantity !== undefined) updates.quantity = dto.quantity;
    if (dto.modifiers !== undefined) updates.modifiers = dto.modifiers;

    const { error: updateError } = await supabase
      .from('order_items')
      .update(updates)
      .eq('id', itemId);

    if (updateError) {
      throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', 'Lỗi khi cập nhật món');
    }

    await this.calculateOrderSubtotal(supabase, orderId);

    return { message: 'Đã cập nhật món' };
  }

  async submitKitchen(user: AuthenticatedUser, accessToken: string, orderId: string) {
    const supabase = this.supabaseService.forUser(accessToken);

    // 1. Check order and join table
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        id, status, table_id, branch_id,
        tables ( table_code )
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      throw new AppException('ERR_4001_ORDER_NOT_FOUND', 'Order không tồn tại');
    }

    if (order.status === 'COMPLETED' || order.status === 'CANCELLED') {
      throw new AppException('ERR_4002_ORDER_ALREADY_COMPLETED', 'Order đã đóng');
    }

    // 2. Check if there are QUEUED items
    const { data: queuedItems, error: itemsError } = await supabase
      .from('order_items')
      .select(`
        id, product_name, quantity, modifiers,
        products ( categories ( kitchen_station ) )
      `)
      .eq('order_id', orderId)
      .eq('kitchen_status', 'QUEUED');

    if (itemsError || !queuedItems || queuedItems.length === 0) {
      throw new AppException('ERR_4003_EMPTY_ORDER_SUBMIT', 'Không có món mới để gửi bếp');
    }

    // 3. Update order status if it's PENDING
    if (order.status === 'PENDING') {
      await supabase
        .from('orders')
        .update({ status: 'IN_PROGRESS' })
        .eq('id', orderId);
    }

    // 4. Fire realtime event kds_new_ticket
    // The spec groups by station
    const stations = new Map<string, any[]>();
    for (const item of queuedItems) {
      const station = (item.products as any)?.categories?.kitchen_station || 'KITCHEN';
      if (!stations.has(station)) {
        stations.set(station, []);
      }
      stations.get(station)!.push({
        order_item_id: item.id,
        product_name: item.product_name,
        quantity: item.quantity,
        modifiers: item.modifiers,
      });
    }

    const tableCode = (order.tables as any)?.table_code || 'Unknown';
    const branchId = order.branch_id;

    for (const [station, items] of stations.entries()) {
      if (branchId) {
        this.realtimeGateway.emitKdsNewTicket(branchId, {
          order_id: order.id,
          table_code: tableCode,
          station: station,
          items: items
        });
      }
    }

    return { message: 'Đã gửi bếp thành công' };
  }

  async updateKitchenStatus(user: AuthenticatedUser, accessToken: string, orderId: string, itemId: string, dto: UpdateKitchenStatusDto) {
    const supabase = this.supabaseService.forUser(accessToken);

    // Retrieve order to get branch_id for emitting event
    const { data: order } = await supabase
      .from('orders')
      .select('branch_id')
      .eq('id', orderId)
      .single();

    const { error: updateError } = await supabase
      .from('order_items')
      .update({ kitchen_status: dto.kitchen_status })
      .eq('id', itemId)
      .eq('order_id', orderId);

    if (updateError) {
      throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', 'Lỗi khi cập nhật trạng thái bếp');
    }

    // Realtime Emit
    if (order?.branch_id) {
      this.realtimeGateway.emitKdsItemStatusChanged(order.branch_id, {
        order_item_id: itemId,
        kitchen_status: dto.kitchen_status,
      });
    }

    return { message: 'Đã cập nhật trạng thái bếp' };
  }

  async payOrder(user: AuthenticatedUser, accessToken: string, orderId: string, dto: PayOrderDto) {
    const supabase = this.supabaseService.forUser(accessToken);

    // 1. Check order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, status, table_id, final_amount, subtotal')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      throw new AppException('ERR_4001_ORDER_NOT_FOUND', 'Order không tồn tại');
    }

    if (order.status === 'COMPLETED' || order.status === 'CANCELLED') {
      throw new AppException('ERR_4002_ORDER_ALREADY_COMPLETED', 'Order đã thanh toán hoặc đã hủy');
    }

    if (dto.payment_method === 'WALLET') {
      // ISSUE 3 FIX: Gọi một RPC fn_pay_order_wallet duy nhất
      // Toàn bộ wallet debit + order COMPLETED xảy ra trong 1 DB transaction
      // Không còn 2 operation độc lập có thể mất đồng bộ
      const supabaseAdmin = this.supabaseService.admin();
      const { data: result, error: rpcError } = await supabaseAdmin.rpc('fn_pay_order_wallet', {
        p_order_id:     orderId,
        p_auth_user_id: user.sub,
        p_tenant_id:    user.tenant_id
      });

      if (rpcError) {
        throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', `Lỗi thanh toán ví: ${rpcError.message}`);
      }

      const rpcResult = result as { success: boolean; error_code?: string; message?: string };
      if (!rpcResult?.success) {
        const errCode = (rpcResult?.error_code ?? 'ERR_9002_INTERNAL_SERVER_ERROR') as import('../../common/constants/error-codes.js').ErrorCode;
        const errMsg  = rpcResult?.message ?? 'Thanh toán ví thất bại';
        throw new AppException(errCode, errMsg);
      }

      // RPC đã tự update order + free table — chỉ cần ghi audit log
      await supabaseAdmin.from('audit_logs').insert({
        tenant_id:    user.tenant_id,
        actor_user_id: user.sub,
        action:       'PAY_ORDER',
        entity_type:  'orders',
        entity_id:    orderId,
        metadata:     { payment_method: 'WALLET', ...rpcResult }
      });

      return { message: 'Đã thanh toán thành công' };

    } else if (dto.payment_method === 'COFFEE_PASS') {
      if (!dto.coffee_pass_subscription_id || !dto.totp_code) {
        throw new AppException('ERR_9001_VALIDATION_FAILED', 'Thiếu thông tin gói Coffee Pass hoặc mã xác nhận');
      }
      await this.coffeePassService.redeemForOrder(user, accessToken, dto.coffee_pass_subscription_id, dto.totp_code, orderId);
    }

    // CASH / VIETQR / COFFEE_PASS: Update order status thông thường
    // (COFFEE_PASS redeemForOrder đã xử lý validation, chỉ cần mark COMPLETED)
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'COMPLETED',
        payment_method: dto.payment_method
      })
      .eq('id', orderId);

    if (updateError) {
      throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', 'Lỗi cập nhật order thành COMPLETED');
    }

    // Free table
    if (order.table_id) {
      await supabase
        .from('tables')
        .update({
          status: 'AVAILABLE',
          current_order_id: null
        })
        .eq('id', order.table_id);
    }

    // Audit Log
    const supabaseAdmin = this.supabaseService.admin();
    await supabaseAdmin.from('audit_logs').insert({
      tenant_id:    user.tenant_id,
      actor_user_id: user.sub,
      action:       'PAY_ORDER',
      entity_type:  'orders',
      entity_id:    orderId,
      metadata:     { payment_method: dto.payment_method }
    });

    return { message: 'Đã thanh toán thành công' };
  }

  async getOrder(user: AuthenticatedUser, accessToken: string, orderId: string) {
    const supabase = this.supabaseService.forUser(accessToken);

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      throw new AppException('ERR_4001_ORDER_NOT_FOUND', 'Order không tồn tại');
    }

    return { order };
  }
}
