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

    await supabase
      .from('orders')
      .update({ subtotal, final_amount: subtotal })
      .eq('id', orderId);
  }

  async createOrder(user: AuthenticatedUser, accessToken: string, dto: CreateOrderDto) {
    const supabase = this.supabaseService.forUser(accessToken);

    // 1. Check table
    const { data: table, error: tableError } = await supabase
      .from('tables')
      .select('id, status, floor_id')
      .eq('id', dto.table_id)
      .single();

    if (tableError || !table) {
      throw new AppException('ERR_2001_TABLE_NOT_FOUND', 'Bàn không tồn tại');
    }

    if (table.status === 'OCCUPIED' || table.status === 'CLEANING') {
      throw new AppException('ERR_2002_TABLE_LOCKED', 'Bàn đang không khả dụng để mở order');
    }

    // 2. Create Order
    const orderCode = 'ORD-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        tenant_id: user.tenant_id,
        branch_id: user.branch_id,
        table_id: dto.table_id,
        order_code: orderCode,
        order_type: 'DINE_IN',
        status: 'PENDING'
      })
      .select('id')
      .single();

    if (orderError) {
      throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', 'Lỗi khi tạo order');
    }

    // 3. Update table status
    await supabase
      .from('tables')
      .update({
        status: 'OCCUPIED',
        current_order_id: order.id
      })
      .eq('id', dto.table_id);

    return { order_id: order.id, order_code: orderCode };
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

    // Integration Boundary cho Wallet & Coffee Pass (Phase 5 & 6)
    if (dto.payment_method === 'WALLET') {
      await this.walletService.payWithWallet(user, accessToken, Number(order.final_amount) || Number(order.subtotal), orderId);
    } else if (dto.payment_method === 'COFFEE_PASS') {
      if (!dto.coffee_pass_subscription_id || !dto.totp_code) {
        throw new AppException('ERR_9001_VALIDATION_FAILED', 'Thiếu thông tin gói Coffee Pass hoặc mã xác nhận');
      }
      await this.coffeePassService.redeemForOrder(user, accessToken, dto.coffee_pass_subscription_id, dto.totp_code, orderId);
    }

    // 2. Mark as completed (VIETQR / default / WALLET / COFFEE_PASS)
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

    // 3. Free table
    if (order.table_id) {
      await supabase
        .from('tables')
        .update({
          status: 'AVAILABLE',
          current_order_id: null
        })
        .eq('id', order.table_id);
    }

    // 4. Audit Log
    const supabaseAdmin = this.supabaseService.admin();
    await supabaseAdmin.from('audit_logs').insert({
      tenant_id: user.tenant_id,
      actor_user_id: user.sub,
      action: 'PAY_ORDER',
      entity_type: 'orders',
      entity_id: orderId,
      metadata: { payment_method: dto.payment_method }
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
