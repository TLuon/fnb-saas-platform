import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.service.js';
import { RedisService } from '../../common/redis.service.js';
import { RealtimeGateway } from '../../common/realtime/realtime.gateway.js';
import { OrderService } from '../order/order.service.js';
import { AppException } from '../../common/exceptions/app.exception.js';
import type { AuthenticatedUser } from '../../common/types/auth.types.js';
import { JoinGroupOrderDto } from './dto/join-group-order.dto.js';
import { AddCartItemDto } from './dto/add-cart-item.dto.js';

@Injectable()
export class GroupOrderService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly redisService: RedisService,
    private readonly realtimeGateway: RealtimeGateway,
    private readonly orderService: OrderService
  ) {}

  private getSessionKey(tenantId: string, tableId: string) {
    return `session:${tenantId}:${tableId}`;
  }

  // 1. Join
  async joinSession(user: AuthenticatedUser, accessToken: string, dto: JoinGroupOrderDto) {
    const supabase = this.supabaseService.forUser(accessToken);
    const { table_id } = dto;

    const { data: table, error } = await supabase
      .from('tables')
      .select('id, status, table_code, current_order_id, floor_id')
      .eq('id', table_id)
      .single();

    if (error || !table) {
      throw new AppException('ERR_2001_TABLE_NOT_FOUND', 'Bàn không tồn tại');
    }

    if (table.status !== 'OCCUPIED' || !table.current_order_id) {
      throw new AppException('ERR_2002_TABLE_LOCKED', 'Bàn chưa có order mở để gọi nhóm');
    }

    const redis = this.redisService.getClient();
    const key = this.getSessionKey(user.tenant_id, table_id);
    
    // Check if session exists in Redis
    let cartStr = await redis.get(key);
    let cart;
    if (!cartStr) {
      cart = {
        table_id,
        cart_items: [],
        cart_total: 0,
        confirmed: false
      };
      await redis.setex(key, 7200, JSON.stringify(cart)); // 2 hours TTL
    } else {
      cart = JSON.parse(cartStr);
      if (cart.confirmed) {
        throw new AppException('ERR_5002_SESSION_ALREADY_CONFIRMED', 'Session đã được chốt, không thể tham gia');
      }
    }

    return { 
      session_key: key, 
      member_info: { id: user.sub, email: user.email },
      cart 
    };
  }

  // 2. Get Cart
  async getCart(user: AuthenticatedUser, accessToken: string, tableId: string) {
    const redis = this.redisService.getClient();
    const key = this.getSessionKey(user.tenant_id, tableId);
    
    const cartStr = await redis.get(key);
    if (!cartStr) {
      throw new AppException('ERR_5001_SESSION_NOT_FOUND', 'Session không tồn tại hoặc đã hết hạn');
    }

    return JSON.parse(cartStr);
  }

  // 3. Add Item with Watch concurrency protection
  async addCartItem(user: AuthenticatedUser, accessToken: string, tableId: string, dto: AddCartItemDto) {
    const supabase = this.supabaseService.forUser(accessToken);

    // Validate product
    const { data: product, error } = await supabase
      .from('products')
      .select('id, name, price, is_active')
      .eq('id', dto.product_id)
      .single();

    if (error || !product || !product.is_active) {
      throw new AppException('ERR_7002_PRODUCT_NOT_FOUND', 'Sản phẩm không khả dụng');
    }

    // ISSUE 1 FIX: Resolve tenant-scoped customers.id từ auth_user_id + tenant_id
    // Không lưu user.sub (auth.users.id) vào added_by_customer_id vì FK phải là customers.id
    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('auth_user_id', user.sub)
      .eq('tenant_id', user.tenant_id)
      .single();
    // Nếu không tìm thấy customer (ví dụ STAFF thêm hộ), để null thay vì FK violation
    const resolvedCustomerId: string | null = customer?.id ?? null;

    const redis = this.redisService.getClient();
    const key = this.getSessionKey(user.tenant_id, tableId);
    
    let retries = 5;
    let finalCart;
    while (retries > 0) {
      await redis.watch(key);
      const cartStr = await redis.get(key);
      if (!cartStr) {
        await redis.unwatch();
        throw new AppException('ERR_5001_SESSION_NOT_FOUND', 'Session không tồn tại');
      }

      const cart = JSON.parse(cartStr);
      if (cart.confirmed) {
        await redis.unwatch();
        throw new AppException('ERR_5002_SESSION_ALREADY_CONFIRMED', 'Session đã được chốt, không thể thêm món');
      }

      // Lưu resolvedCustomerId (customers.id) thay vì auth user UUID
      cart.cart_items.push({
        product_id: product.id,
        product_name: product.name,
        quantity: dto.quantity,
        unit_price: product.price,
        modifiers: dto.modifiers || [],
        added_by_customer_id: resolvedCustomerId,
        added_by_name: user.email || 'Khách'
      });

      // Recalculate total
      cart.cart_total = cart.cart_items.reduce((sum: number, item: any) => sum + (item.quantity * item.unit_price), 0);

      const res = await redis.multi().setex(key, 7200, JSON.stringify(cart)).exec();
      if (res) {
        finalCart = cart;
        break;
      }
      retries--;
    }

    if (!finalCart) {
      throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', 'Conflict khi cập nhật giỏ hàng. Vui lòng thử lại.');
    }

    // Realtime Emit — REALTIME_EVENTS.md #2.4
    this.realtimeGateway.emitGroupOrderCartUpdated(user.tenant_id, tableId, finalCart);

    return { message: 'Đã thêm vào giỏ hàng nhóm', cart: finalCart };
  }

  // 4. Confirm
  async confirmGroupOrder(user: AuthenticatedUser, accessToken: string, tableId: string) {
    const supabase = this.supabaseService.forUser(accessToken);
    const redis = this.redisService.getClient();
    const key = this.getSessionKey(user.tenant_id, tableId);

    // Watch for concurrency (prevent double confirm)
    await redis.watch(key);
    const cartStr = await redis.get(key);
    if (!cartStr) {
      await redis.unwatch();
      throw new AppException('ERR_5001_SESSION_NOT_FOUND', 'Session không tồn tại');
    }

    const cart = JSON.parse(cartStr);
    if (cart.confirmed) {
      await redis.unwatch();
      throw new AppException('ERR_5002_SESSION_ALREADY_CONFIRMED', 'Session đã được chốt trước đó');
    }

    if (cart.cart_items.length === 0) {
      await redis.unwatch();
      throw new AppException('ERR_4003_EMPTY_ORDER_SUBMIT', 'Giỏ hàng nhóm đang trống');
    }

    // Lock session in Redis (temporary lock while processing DB mutations)
    cart.confirmed = true;
    const res = await redis.multi().setex(key, 7200, JSON.stringify(cart)).exec();
    if (!res) {
      throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', 'Có người khác đang thao tác trên giỏ hàng');
    }

    let orderId: string | null = null;
    let insertedItemIds: string[] = [];

    try {
      // Insert items to Postgres
      const { data: table } = await supabase.from('tables').select('current_order_id').eq('id', tableId).single();
      if (!table || !table.current_order_id) {
        throw new AppException('ERR_4001_ORDER_NOT_FOUND', 'Không tìm thấy order liên kết với bàn');
      }
      orderId = table.current_order_id;

      const itemsToInsert = cart.cart_items.map((item: any) => ({
        order_id: orderId,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        modifiers: item.modifiers,
        kitchen_status: 'QUEUED',
        added_by_customer_id: item.added_by_customer_id
      }));

      const { data: insertedItems, error: insertError } = await supabase
        .from('order_items')
        .insert(itemsToInsert)
        .select('id');

      if (insertError || !insertedItems) {
        throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', 'Lỗi khi ghi nhận order');
      }
      insertedItemIds = insertedItems.map((i: any) => i.id);

      // Recalculate Subtotal
      const { data: items } = await supabase.from('order_items').select('quantity, unit_price').eq('order_id', orderId);
      if (items) {
        const subtotal = items.reduce((sum: number, it: any) => sum + (it.quantity * it.unit_price), 0);
        await supabase.from('orders').update({ subtotal, final_amount: subtotal }).eq('id', orderId);
      }

      // Call submitKitchen from OrderService
      await this.orderService.submitKitchen(user, accessToken, orderId!);

      // Delete session after successful submit
      await redis.del(key);

      // Emit final empty/confirmed state — REALTIME_EVENTS.md #2.4
      this.realtimeGateway.emitGroupOrderCartUpdated(user.tenant_id, tableId, {
        table_id: tableId,
        cart_items: [],
        cart_total: 0,
        confirmed: true
      });

      return { message: 'Đã chốt order nhóm thành công' };
    } catch (error) {
      // NEW-008 / ISSUE-003: Compensating rollback on partial DB success
      // If order_items were inserted but submitKitchen (or subtotal update) failed,
      // delete the inserted order_items and restore previous subtotal to prevent duplicate items / double billing on retry
      if (insertedItemIds.length > 0 && orderId) {
        try {
          await supabase.from('order_items').delete().in('id', insertedItemIds);
          const { data: remainingItems } = await supabase.from('order_items').select('quantity, unit_price').eq('order_id', orderId);
          const subtotal = (remainingItems || []).reduce((sum: number, it: any) => sum + (it.quantity * it.unit_price), 0);
          await supabase.from('orders').update({ subtotal, final_amount: subtotal }).eq('id', orderId);
        } catch {
          // Best effort rollback
        }
      }

      // Revert confirmed state in Redis with 7200s TTL so members can retry
      cart.confirmed = false;
      await redis.setex(key, 7200, JSON.stringify(cart));
      throw error;
    }
  }
}
