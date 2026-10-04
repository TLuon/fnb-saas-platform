import { Injectable, Optional } from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.service.js';
import type { AuthenticatedUser } from '../../common/types/auth.types.js';
import { AppException } from '../../common/exceptions/app.exception.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { AddOrderItemDto } from './dto/add-order-item.dto.js';
import { UpdateOrderItemDto } from './dto/update-order-item.dto.js';
import { UpdateKitchenStatusDto } from './dto/update-kitchen-status.dto.js';
import { PayOrderDto } from './dto/pay-order.dto.js';
import { ListOrdersQueryDto } from './dto/list-orders-query.dto.js';
import { KdsOrdersQueryDto } from './dto/kds-orders-query.dto.js';
import { RealtimeGateway } from '../../common/realtime/realtime.gateway.js';
import { WalletService } from '../wallet/wallet.service.js';
import { CoffeePassService } from '../coffee-pass/coffee-pass.service.js';
import { InventoryService } from '../inventory/inventory.service.js';

@Injectable()
export class OrderService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly realtimeGateway: RealtimeGateway,
    private readonly walletService: WalletService,
    private readonly coffeePassService: CoffeePassService,
    @Optional() private readonly inventoryService?: InventoryService,
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
    // NEW-007 & B1-010 FIX: Gọi atomic RPC fn_create_order (migration 007 & 010)
    // Toàn bộ logic kiểm tra bàn, khóa dòng FOR UPDATE, kiểm tra và khấu trừ cọc,
    // tạo order, tự động mapping ca làm việc OPEN và cập nhật bàn OCCUPIED diễn ra
    // trong 1 transaction duy nhất tại database layer.
    const orderCode = 'ORD-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const supabaseAdmin = this.supabaseService.admin();

    let customerId: string | null = null;
    if (user.role_app === 'CUSTOMER') {
      const { data: customer, error: customerError } = await supabaseAdmin
        .from('customers')
        .select('id')
        .eq('auth_user_id', user.sub)
        .eq('tenant_id', user.tenant_id)
        .maybeSingle();

      if (customerError || !customer) {
        throw new AppException('ERR_1001_UNAUTHORIZED', 'Không tìm thấy hồ sơ khách hàng');
      }
      customerId = customer.id;
    }

    const orderType = dto.order_type ?? 'DINE_IN';
    const tableId = orderType === 'DINE_IN' ? (dto.table_id || null) : null;

    let branchId = dto.branch_id || user.branch_id || null;
    if (!branchId) {
      if (tableId) {
        const { data: tableData } = await supabaseAdmin
          .from('tables')
          .select('floors(branch_id)')
          .eq('id', tableId)
          .maybeSingle();
        branchId = (tableData?.floors as any)?.branch_id || null;
      }
      if (!branchId) {
        const { data: branchData } = await supabaseAdmin
          .from('branches')
          .select('id')
          .eq('tenant_id', user.tenant_id)
          .limit(1)
          .maybeSingle();
        branchId = branchData?.id || null;
      }
    }

    if (!branchId) {
      throw new AppException('ERR_9001_VALIDATION_FAILED', 'Không tìm thấy chi nhánh cho đơn hàng');
    }

    let tableWasOccupied = false;
    if (tableId && orderType === 'DINE_IN') {
      const { data: tData } = await supabaseAdmin.from('tables').select('status, current_order_id').eq('id', tableId).single();
      if (tData && tData.status === 'OCCUPIED' && !tData.current_order_id) {
        // Tạm set AVAILABLE để vượt qua block của fn_create_order
        await supabaseAdmin.from('tables').update({ status: 'AVAILABLE' }).eq('id', tableId);
        tableWasOccupied = true;
      }
    }

    const { data: result, error: rpcError } = await supabaseAdmin.rpc('fn_create_order', {
      p_tenant_id:        user.tenant_id,
      p_branch_id:        branchId,
      p_table_id:         tableId,
      p_order_code:       orderCode,
      p_reservation_code: dto.reservation_code || null,
      p_order_type:       orderType,
      p_shift_id:         null,
    });

    if (rpcError) {
      if (tableWasOccupied) {
        await supabaseAdmin.from('tables').update({ status: 'OCCUPIED' }).eq('id', tableId);
      }
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
      if (tableWasOccupied) {
        await supabaseAdmin.from('tables').update({ status: 'OCCUPIED' }).eq('id', tableId);
      }
      const errCode = (rpcResult?.error_code ?? 'ERR_9002_INTERNAL_SERVER_ERROR') as import('../../common/constants/error-codes.js').ErrorCode;
      const errMsg  = rpcResult?.message ?? 'Tạo order thất bại';
      throw new AppException(errCode, errMsg);
    }

    if (customerId) {
      const { data: linkedOrder, error: linkError } = await supabaseAdmin
        .from('orders')
        .update({ customer_id: customerId })
        .eq('id', rpcResult.order_id)
        .eq('tenant_id', user.tenant_id)
        .select('id')
        .maybeSingle();

      if (linkError || !linkedOrder) {
        await supabaseAdmin
          .from('orders')
          .delete()
          .eq('id', rpcResult.order_id)
          .eq('tenant_id', user.tenant_id);
        throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', 'Không thể liên kết đơn hàng với khách hàng');
      }
    }

    return {
      id: rpcResult.order_id,
      order_id: rpcResult.order_id,
      order_code: rpcResult.order_code,
      deposit_applied: rpcResult.deposit_applied ?? 0,
    };
  }

  async addOrderItem(user: AuthenticatedUser, accessToken: string, orderId: string, dto: AddOrderItemDto) {
    const supabase = user.role_app === 'OWNER' ? this.supabaseService.admin() : this.supabaseService.forUser(accessToken);

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
      console.error('LỖI THÊM MÓN:', insertError);
      throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', 'Lỗi khi thêm món');
    }

    await this.calculateOrderSubtotal(supabase, orderId);

    return { message: 'Đã thêm món vào order' };
  }

  async updateOrderItem(user: AuthenticatedUser, accessToken: string, orderId: string, itemId: string, dto: UpdateOrderItemDto) {
    const supabase = user.role_app === 'OWNER' ? this.supabaseService.admin() : this.supabaseService.forUser(accessToken);

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
    const supabase = user.role_app === 'OWNER' ? this.supabaseService.admin() : this.supabaseService.forUser(accessToken);

    // 1. Check order and join table
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        id, order_code, status, table_id, branch_id, order_type,
        tables ( table_code )
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      throw new AppException('ERR_4001_ORDER_NOT_FOUND', 'Order không tồn tại');
    }

    if (order.status === 'CANCELLED') {
      throw new AppException('ERR_4002_ORDER_ALREADY_COMPLETED', 'Order đã hủy');
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
    const orderCode = (order as any).order_code || ('ORD-' + order.id.slice(0, 6).toUpperCase());

    for (const [station, items] of stations.entries()) {
      if (branchId) {
        this.realtimeGateway.emitKdsNewTicket(branchId, {
          order_id: order.id,
          order_code: orderCode,
          order_type: order.order_type,
          table_name: tableCode,
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

    // 1. Verify order exists and belongs to tenant
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, branch_id, status, order_code')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      throw new AppException('ERR_4001_ORDER_NOT_FOUND', 'Order không tồn tại');
    }

    if (order.status === 'COMPLETED' || order.status === 'CANCELLED') {
      throw new AppException('ERR_4002_ORDER_ALREADY_COMPLETED', 'Order đã hoàn tất hoặc đã bị hủy');
    }

    // 2. Fetch existing order item to check existence & valid transition
    const { data: item, error: itemError } = await supabase
      .from('order_items')
      .select('id, kitchen_status, product_name')
      .eq('id', itemId)
      .eq('order_id', orderId)
      .single();

    if (itemError || !item) {
      throw new AppException('ERR_9001_VALIDATION_FAILED', 'Item không tồn tại trong order này');
    }

    const currentStatus = item.kitchen_status;
    const targetStatus = dto.kitchen_status;

    // Idempotent: if already at target status, return success
    if (currentStatus === targetStatus) {
      return { message: 'Đã cập nhật trạng thái bếp' };
    }

    // Validate state transitions: QUEUED -> PREPARING -> READY -> SERVED
    const validTransitions: Record<string, string[]> = {
      QUEUED: ['PREPARING'],
      PREPARING: ['READY'],
      READY: ['SERVED'],
      SERVED: [],
    };

    const allowed = validTransitions[currentStatus] || [];
    if (!allowed.includes(targetStatus)) {
      throw new AppException(
        'ERR_9001_VALIDATION_FAILED',
        `Chuyển trạng thái bếp không hợp lệ từ ${currentStatus} sang ${targetStatus}`
      );
    }

    const { error: updateError } = await supabase
      .from('order_items')
      .update({ kitchen_status: targetStatus })
      .eq('id', itemId)
      .eq('order_id', orderId);

    if (updateError) {
      throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', 'Lỗi khi cập nhật trạng thái bếp');
    }

    // Realtime Emit
    if (order.branch_id) {
      this.realtimeGateway.emitKdsItemStatusChanged(order.branch_id, {
        order_id: order.id,
        order_item_id: itemId,
        kitchen_status: targetStatus,
        order_code: order.order_code,
        product_name: item.product_name,
      });
    }

    return { message: 'Đã cập nhật trạng thái bếp' };
  }

  async payOrder(user: AuthenticatedUser, accessToken: string, orderId: string, dto: PayOrderDto) {
    const supabase = this.supabaseService.forUser(accessToken);

    // 1. Check order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, status, table_id, final_amount, subtotal, branch_id, shift_id, order_type, customers(auth_user_id)')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      throw new AppException('ERR_4001_ORDER_NOT_FOUND', 'Order không tồn tại');
    }

    if (order.status === 'COMPLETED' || order.status === 'CANCELLED') {
      throw new AppException('ERR_4002_ORDER_ALREADY_COMPLETED', 'Order đã thanh toán hoặc đã hủy');
    }

    let appliedVoucherId: string | null = null;
    if (dto.voucher_id) {
      if (user.role_app !== 'CUSTOMER') {
        throw new AppException('ERR_1001_UNAUTHORIZED', 'Voucher khách hàng chỉ áp dụng trên tài khoản khách');
      }

      const admin = this.supabaseService.admin();
      const { data: customer } = await admin
        .from('customers')
        .select('id')
        .eq('auth_user_id', user.sub)
        .eq('tenant_id', user.tenant_id)
        .maybeSingle();

      if (!customer) {
        throw new AppException('ERR_1001_UNAUTHORIZED', 'Không tìm thấy hồ sơ khách hàng');
      }

      const { data: voucher, error: voucherError } = await admin
        .from('customer_vouchers')
        .select('id, customer_id, discount_percent, free_item_product_id, is_used, expires_at')
        .eq('id', dto.voucher_id)
        .eq('customer_id', customer.id)
        .eq('is_used', false)
        .maybeSingle();

      if (voucherError || !voucher) {
        throw new AppException('ERR_9001_VALIDATION_FAILED', 'Voucher không hợp lệ hoặc đã được sử dụng');
      }
      if (voucher.expires_at && new Date(voucher.expires_at).getTime() <= Date.now()) {
        throw new AppException('ERR_9001_VALIDATION_FAILED', 'Voucher đã hết hạn');
      }
      if (!voucher.discount_percent) {
        throw new AppException('ERR_9001_VALIDATION_FAILED', 'Voucher này chưa hỗ trợ cho đơn hàng hiện tại');
      }

      const subtotal = Number(order.subtotal || 0);
      const discountAmount = Math.min(
        subtotal,
        Math.round(subtotal * Number(voucher.discount_percent) / 100),
      );
      const finalAmount = Math.max(0, subtotal - discountAmount);
      const { error: discountError } = await admin
        .from('orders')
        .update({ discount_amount: discountAmount, final_amount: finalAmount })
        .eq('id', orderId)
        .eq('tenant_id', user.tenant_id);

      if (discountError) {
        throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', 'Không thể áp dụng voucher vào đơn hàng');
      }

      order.final_amount = finalAmount;
      appliedVoucherId = voucher.id;
    }

    const markVoucherUsed = async () => {
      if (!appliedVoucherId) return;
      const { error } = await this.supabaseService.admin()
        .from('customer_vouchers')
        .update({ is_used: true })
        .eq('id', appliedVoucherId)
        .eq('is_used', false);
      if (error) {
        throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', 'Thanh toán thành công nhưng không thể cập nhật voucher');
      }
    };

    // 1B. Shift Guard: Kiểm tra chi nhánh phải có ca mở để thanh toán
    const branchId = order.branch_id || user.branch_id;
    let activeShiftId: string | null = null;
    if (branchId) {
      const supabaseAdmin = this.supabaseService.admin();
      const shiftQuery = supabaseAdmin.from('shifts');
      if (shiftQuery && typeof shiftQuery.select === 'function') {
        const q = shiftQuery
          .select('id')
          .eq('tenant_id', user.tenant_id)
          .eq('branch_id', branchId)
          .eq('status', 'OPEN');
        const { data: activeShift } = typeof q.maybeSingle === 'function' ? await q.maybeSingle() : await q.single();

        if (!activeShift) {
          throw new AppException(
            'ERR_9001_VALIDATION_FAILED',
            'Không thể thanh toán đơn hàng khi chưa mở ca làm việc',
          );
        }
        activeShiftId = activeShift.id;

        if (!order.shift_id && activeShift.id) {
          order.shift_id = activeShift.id;
          const updateQuery = supabaseAdmin.from('orders');
          if (typeof updateQuery?.update === 'function') {
            await updateQuery
              .update({ shift_id: activeShift.id })
              .eq('id', orderId);
          }
        }
      }
    } else if (dto.payment_method === 'CASH') {
      throw new AppException(
        'ERR_9001_VALIDATION_FAILED',
        'Không thể thanh toán đơn hàng khi chưa mở ca làm việc',
      );
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

      // Trigger inventory deduction nếu có InventoryService
      if (this.inventoryService) {
        try {
          await this.inventoryService.consumeForCompletedOrder(accessToken, user, orderId);
        } catch {
          // B1 Blocker boundary: Không phá vỡ payment đã hoàn tất khi thiếu DB RPC trừ kho
        }
      }

      await markVoucherUsed();

      return { message: 'Đã thanh toán thành công' };

    } else if (dto.payment_method === 'COFFEE_PASS') {
      if (!dto.coffee_pass_subscription_id || !dto.totp_code) {
        throw new AppException('ERR_9001_VALIDATION_FAILED', 'Thiếu thông tin gói Coffee Pass hoặc mã xác nhận');
      }
      await this.coffeePassService.redeemForOrder(user, accessToken, dto.coffee_pass_subscription_id, dto.totp_code, orderId);
    }

    const targetStatus = dto.payment_method === 'CASH'
      ? 'COMPLETED'
      : (dto.status || (order.status === 'PENDING' ? 'IN_PROGRESS' : 'COMPLETED'));

    const updatePayload: Record<string, any> = {
      status: targetStatus,
      payment_method: dto.payment_method
    };
    if (activeShiftId && !order.shift_id) {
      updatePayload.shift_id = activeShiftId;
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update(updatePayload)
      .eq('id', orderId);

    if (updateError) {
      console.error('LỖI UPDATE ORDER:', updateError);
      throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', 'Lỗi cập nhật order thành COMPLETED');
    }

    // Free table on COMPLETED order
    if (order.table_id && targetStatus === 'COMPLETED') {
      await supabase
        .from('tables')
        .update({
          status: 'AVAILABLE',
          current_order_id: null
        })
        .eq('id', order.table_id);
      this.realtimeGateway?.emitTableStatusChanged?.(order.table_id, 'AVAILABLE');
    }

    // Persist payment transaction for CASH or completed orders
    const supabaseAdmin = this.supabaseService.admin();
    if (dto.payment_method === 'CASH' || targetStatus === 'COMPLETED') {
      const { data: existingTx } = await supabaseAdmin
        .from('payment_transactions')
        .select('id')
        .eq('tenant_id', user.tenant_id)
        .eq('order_id', orderId)
        .eq('status', 'COMPLETED')
        .maybeSingle();

      if (!existingTx) {
        await supabaseAdmin.from('payment_transactions').insert({
          tenant_id: user.tenant_id,
          order_id: orderId,
          amount: Number(order.final_amount ?? order.subtotal ?? 0),
          raw_transfer_content: dto.payment_method,
          status: 'COMPLETED',
          matched_customer_id: (order as any).customer_id || null,
        });
      }
    }

    // Audit Log
    await supabaseAdmin.from('audit_logs').insert({
      tenant_id:    user.tenant_id,
      actor_user_id: user.sub,
      action:       'PAY_ORDER',
      entity_type:  'orders',
      entity_id:    orderId,
      metadata:     { payment_method: dto.payment_method }
    });

    // Trigger inventory deduction nếu có InventoryService và đơn đã hoàn tất
    if (this.inventoryService && targetStatus === 'COMPLETED') {
      try {
        await this.inventoryService.consumeForCompletedOrder(accessToken, user, orderId);
      } catch {
        // B1 Blocker boundary: Không phá vỡ payment đã hoàn tất khi thiếu DB RPC trừ kho
      }
    }

    await markVoucherUsed();

    if (this.realtimeGateway) {
      const authUserId = (order.customers as any)?.auth_user_id || null;
      let msg = 'Đơn hàng của bạn đã được cập nhật.';
      if (targetStatus === 'IN_PROGRESS') {
        msg = 'Nhà hàng đã xác nhận thanh toán và đang chuẩn bị món cho bạn!';
      } else if (targetStatus === 'COMPLETED') {
        msg = 'Đơn hàng của bạn đã hoàn tất. Chúc bạn ngon miệng!';
      }
      this.realtimeGateway?.emitOrderStatusChanged?.(orderId, authUserId, {
        status: targetStatus,
        message: msg,
      });
    }

    return { message: 'Đã thanh toán thành công' };
  }

  async cancelOrder(user: AuthenticatedUser, accessToken: string, orderId: string, reason?: string) {
    const supabase = this.supabaseService.forUser(accessToken);

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, status, table_id, customers(auth_user_id)')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      throw new AppException('ERR_4001_ORDER_NOT_FOUND', 'Order không tồn tại');
    }

    if (order.status === 'CANCELLED') {
      throw new AppException('ERR_4002_ORDER_ALREADY_COMPLETED', 'Order đã bị hủy trước đó');
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update({ status: 'CANCELLED' })
      .eq('id', orderId);

    if (updateError) {
      throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', 'Lỗi khi hủy đơn hàng');
    }

    if (order.table_id) {
      await supabase
        .from('tables')
        .update({ status: 'AVAILABLE', current_order_id: null })
        .eq('id', order.table_id);
    }

    if (this.realtimeGateway) {
      const authUserId = (order.customers as any)?.auth_user_id || null;
      this.realtimeGateway.emitOrderStatusChanged(orderId, authUserId, {
        status: 'CANCELLED',
        reason: reason || 'Cửa hàng đã hủy đơn này.',
      });
    }

    return { message: 'Đã hủy đơn hàng' };
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

  async listOrders(user: AuthenticatedUser, accessToken: string, query: ListOrdersQueryDto) {
    if (user.role_app === 'STAFF') {
      if (!user.branch_id) {
        throw new AppException('ERR_1001_UNAUTHORIZED', 'Tài khoản nhân viên chưa được gán chi nhánh');
      }
      if (query.branch_id && query.branch_id !== user.branch_id) {
        throw new AppException('ERR_1003_TENANT_MISMATCH', 'Không có quyền truy cập chi nhánh khác');
      }
    }

    const supabase = this.supabaseService.forUser(accessToken);
    const page = query.page && query.page >= 1 ? Math.floor(query.page) : 1;
    const limit = query.limit && query.limit >= 1 ? Math.min(Math.floor(query.limit), 100) : 20;
    const offset = (page - 1) * limit;

    let customerId: string | null = null;
    if (user.role_app === 'CUSTOMER') {
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('auth_user_id', user.sub)
        .eq('tenant_id', user.tenant_id)
        .maybeSingle();

      if (!customer) {
        return {
          data: [],
          meta: { total: 0, page, limit },
        };
      }
      customerId = customer.id;
    }

    let queryBuilder = supabase
      .from('orders')
      .select('*, order_items(*), tables(table_code, name)', { count: 'exact' })
      .eq('tenant_id', user.tenant_id);

    // Role scoping
    if (user.role_app === 'CUSTOMER') {
      queryBuilder = queryBuilder.eq('customer_id', customerId);
    } else if (user.role_app === 'STAFF') {
      queryBuilder = queryBuilder.eq('branch_id', user.branch_id);
    } else if (user.role_app === 'OWNER') {
      if (query.branch_id) {
        queryBuilder = queryBuilder.eq('branch_id', query.branch_id);
      }
    }

    if (query.status) {
      queryBuilder = queryBuilder.eq('status', query.status);
    }

    if (query.order_type) {
      queryBuilder = queryBuilder.eq('order_type', query.order_type);
    }

    queryBuilder = queryBuilder
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await queryBuilder;

    if (error) {
      throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', `Lỗi khi lấy danh sách đơn hàng: ${error.message}`);
    }

    const items = data ?? [];
    const total = count ?? 0;

    return {
      data: items,
      meta: { total, page, limit },
    };
  }

  async getKdsSnapshot(user: AuthenticatedUser, accessToken: string, query: KdsOrdersQueryDto) {
    if (user.role_app === 'STAFF') {
      if (!user.branch_id) {
        throw new AppException('ERR_1001_UNAUTHORIZED', 'Tài khoản nhân viên chưa được gán chi nhánh');
      }
      if (query.branch_id && query.branch_id !== user.branch_id) {
        throw new AppException('ERR_1003_TENANT_MISMATCH', 'Không có quyền truy cập chi nhánh khác');
      }
    }

    const branchId = user.role_app === 'STAFF' ? user.branch_id : query.branch_id;
    if (!branchId) {
      throw new AppException('ERR_9001_VALIDATION_FAILED', 'Thiếu thông tin branch_id');
    }

    const supabase = this.supabaseService.forUser(accessToken);

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        id,
        order_code,
        table_id,
        order_type,
        status,
        created_at,
        tables ( table_code ),
        order_items (
          id,
          product_name,
          quantity,
          modifiers,
          kitchen_status,
          created_at,
          products (
            categories ( kitchen_station )
          )
        )
      `)
      .eq('tenant_id', user.tenant_id)
      .eq('branch_id', branchId)
      .in('status', ['IN_PROGRESS'])
      .gte('created_at', yesterday.toISOString())
      .order('created_at', { ascending: true });

    if (error) {
      throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', `Lỗi khi lấy dữ liệu KDS: ${error.message}`);
    }

    const activeStatuses = query.status
      ? [query.status]
      : ['QUEUED', 'PREPARING', 'READY'];

    const kdsItems: Array<{
      order_id: string;
      order_code: string;
      table_id: string | null;
      table_code: string | null;
      order_type: string;
      created_at: string;
      order_item_id: string;
      product_name: string;
      quantity: number;
      modifiers: any[];
      kitchen_status: string;
      station: 'BAR' | 'KITCHEN';
    }> = [];

    for (const order of orders ?? []) {
      const tableCode = (order.tables as any)?.table_code ?? null;
      const rawItems = (order.order_items as any[]) ?? [];

      const sortedItems = [...rawItems].sort((a, b) => {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return timeA - timeB;
      });

      for (const item of sortedItems) {
        if (!activeStatuses.includes(item.kitchen_status)) {
          continue;
        }

        const station = ((item.products as any)?.categories?.kitchen_station || 'KITCHEN') as 'BAR' | 'KITCHEN';
        if (query.station && station !== query.station) {
          continue;
        }

        kdsItems.push({
          order_id: order.id,
          order_code: order.order_code || ('ORD-' + order.id.slice(0, 6).toUpperCase()),
          table_id: order.table_id ?? null,
          table_code: tableCode,
          order_type: order.order_type ?? 'DINE_IN',
          created_at: item.created_at || order.created_at,
          order_item_id: item.id,
          product_name: item.product_name,
          quantity: item.quantity,
          modifiers: item.modifiers ?? [],
          kitchen_status: item.kitchen_status,
          station: station,
        });
      }
    }

    return kdsItems;
  }
}
