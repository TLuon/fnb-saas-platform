import { Injectable, Optional } from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.service.js';
import { RealtimeGateway } from '../../common/realtime/realtime.gateway.js';
import { AppException } from '../../common/exceptions/app.exception.js';
import type { AuthenticatedUser } from '../../common/types/auth.types.js';
import { CreateIngredientDto } from './dto/create-ingredient.dto.js';
import { UpdateIngredientDto } from './dto/update-ingredient.dto.js';
import { CreateRecipeDto } from './dto/create-recipe.dto.js';
import { CreateTransactionDto } from './dto/create-transaction.dto.js';
import { ListIngredientsQueryDto } from './dto/list-ingredients-query.dto.js';
import { ListTransactionsQueryDto } from './dto/list-transactions-query.dto.js';

@Injectable()
export class InventoryService {
  constructor(
    private readonly supabase: SupabaseService,
    @Optional() private readonly realtimeGateway?: RealtimeGateway,
  ) {}

  /** ── 1. INGREDIENTS CRUD ── */

  async listIngredients(accessToken: string, query: ListIngredientsQueryDto) {
    const client = this.supabase.forUser(accessToken);
    let builder = client
      .from('ingredients')
      .select('*')
      .order('name', { ascending: true });

    if (query.search) {
      builder = builder.ilike('name', `%${query.search}%`);
    }

    const { data, error } = await builder;
    if (error) throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', error.message);
    return data ?? [];
  }

  async getIngredient(accessToken: string, id: string) {
    const client = this.supabase.forUser(accessToken);
    const { data, error } = await client
      .from('ingredients')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', error.message);
    if (!data) throw new AppException('ERR_9001_VALIDATION_FAILED', 'Không tìm thấy nguyên vật liệu');
    return data;
  }

  async createIngredient(accessToken: string, user: AuthenticatedUser, dto: CreateIngredientDto) {
    const client = this.supabase.forUser(accessToken);

    // Kiểm tra trùng SKU trong tenant nếu có SKU
    if (dto.sku) {
      const { data: existingSku } = await client
        .from('ingredients')
        .select('id')
        .eq('sku', dto.sku)
        .maybeSingle();

      if (existingSku) {
        throw new AppException('ERR_9001_VALIDATION_FAILED', `Mã SKU ${dto.sku} đã tồn tại`);
      }
    }

    const { data, error } = await client
      .from('ingredients')
      .insert({
        tenant_id: user.tenant_id,
        name: dto.name,
        sku: dto.sku ?? null,
        unit: dto.unit,
        current_stock: dto.current_stock ?? 0,
        min_stock_alert: dto.min_stock_alert ?? 0,
        cost_per_unit: dto.cost_per_unit ?? 0,
      })
      .select()
      .single();

    if (error) throw new AppException('ERR_9001_VALIDATION_FAILED', error.message);
    return data;
  }

  async updateIngredient(accessToken: string, _user: AuthenticatedUser, id: string, dto: UpdateIngredientDto) {
    const client = this.supabase.forUser(accessToken);

    // Kiểm tra tồn tại
    const existing = await this.getIngredient(accessToken, id);

    if (dto.sku && dto.sku !== existing.sku) {
      const { data: existingSku } = await client
        .from('ingredients')
        .select('id')
        .eq('sku', dto.sku)
        .maybeSingle();

      if (existingSku) {
        throw new AppException('ERR_9001_VALIDATION_FAILED', `Mã SKU ${dto.sku} đã tồn tại`);
      }
    }

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (dto.name !== undefined) updatePayload.name = dto.name;
    if (dto.sku !== undefined) updatePayload.sku = dto.sku;
    if (dto.unit !== undefined) updatePayload.unit = dto.unit;
    if (dto.current_stock !== undefined) updatePayload.current_stock = dto.current_stock;
    if (dto.min_stock_alert !== undefined) updatePayload.min_stock_alert = dto.min_stock_alert;
    if (dto.cost_per_unit !== undefined) updatePayload.cost_per_unit = dto.cost_per_unit;

    const { data, error } = await client
      .from('ingredients')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new AppException('ERR_9001_VALIDATION_FAILED', error.message);
    return data;
  }

  async deleteIngredient(accessToken: string, _user: AuthenticatedUser, id: string) {
    const client = this.supabase.forUser(accessToken);

    // Kiểm tra tồn tại
    await this.getIngredient(accessToken, id);

    // Chặn xóa nếu nguyên vật liệu đang được liên kết trong công thức món
    const { data: recipes, error: recipeError } = await client
      .from('product_recipes')
      .select('id')
      .eq('ingredient_id', id)
      .limit(1);

    if (recipeError) throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', recipeError.message);
    if (recipes && recipes.length > 0) {
      throw new AppException(
        'ERR_9001_VALIDATION_FAILED',
        'Không thể xóa nguyên vật liệu đang được dùng trong công thức món',
      );
    }

    const { error: deleteError } = await client
      .from('ingredients')
      .delete()
      .eq('id', id);

    if (deleteError) throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', deleteError.message);
    return { message: 'Đã xóa nguyên vật liệu thành công' };
  }

  /** ── 2. PRODUCT RECIPES ── */

  async getRecipes(accessToken: string, productId?: string) {
    const client = this.supabase.forUser(accessToken);
    let builder = client
      .from('product_recipes')
      .select('id, product_id, ingredient_id, amount, created_at, ingredients(id, name, unit, current_stock)');

    if (productId) {
      builder = builder.eq('product_id', productId);
    }

    const { data, error } = await builder;
    if (error) throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', error.message);
    return data ?? [];
  }

  async createRecipe(accessToken: string, user: AuthenticatedUser, dto: CreateRecipeDto) {
    const client = this.supabase.forUser(accessToken);

    // Kiểm tra nguyên liệu có tồn tại trong tenant
    await this.getIngredient(accessToken, dto.ingredient_id);

    // Upsert định lượng công thức
    const { data: existing } = await client
      .from('product_recipes')
      .select('id')
      .eq('product_id', dto.product_id)
      .eq('ingredient_id', dto.ingredient_id)
      .maybeSingle();

    if (existing) {
      const { data, error } = await client
        .from('product_recipes')
        .update({ amount: dto.amount })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw new AppException('ERR_9001_VALIDATION_FAILED', error.message);
      return data;
    }

    const { data, error } = await client
      .from('product_recipes')
      .insert({
        tenant_id: user.tenant_id,
        product_id: dto.product_id,
        ingredient_id: dto.ingredient_id,
        amount: dto.amount,
      })
      .select()
      .single();

    if (error) throw new AppException('ERR_9001_VALIDATION_FAILED', error.message);
    return data;
  }

  async deleteRecipe(accessToken: string, _user: AuthenticatedUser, productId: string, ingredientId: string) {
    const client = this.supabase.forUser(accessToken);

    const { error } = await client
      .from('product_recipes')
      .delete()
      .eq('product_id', productId)
      .eq('ingredient_id', ingredientId);

    if (error) throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', error.message);
    return { message: 'Đã xóa nguyên liệu khỏi công thức món' };
  }

  /** ── 3. INVENTORY TRANSACTIONS (XUẤT / NHẬP / ĐIỀU CHỈNH) ── */

  async createTransaction(accessToken: string, user: AuthenticatedUser, dto: CreateTransactionDto) {
    const client = this.supabase.forUser(accessToken);

    // 1. Kiểm tra nguyên liệu
    const ingredient = await this.getIngredient(accessToken, dto.ingredient_id);
    const currentStock = Number(ingredient.current_stock || 0);
    const qty = Number(dto.quantity);

    if (isNaN(qty) || qty <= 0) {
      throw new AppException('ERR_9001_VALIDATION_FAILED', 'Số lượng giao dịch kho phải lớn hơn 0');
    }

    let newStock = currentStock;

    if (dto.type === 'IMPORT') {
      newStock = currentStock + qty;
    } else if (dto.type === 'EXPORT') {
      if (currentStock < qty) {
        throw new AppException(
          'ERR_9001_VALIDATION_FAILED',
          `Số lượng tồn kho hiện tại (${currentStock}) không đủ để xuất kho (${qty})`,
        );
      }
      newStock = currentStock - qty;
    } else if (dto.type === 'ADJUSTMENT') {
      // Điều chỉnh trực tiếp về số lượng mới
      newStock = qty;
    }

    const appUserId = await this.resolvePublicUserId(client, user);

    // 2. Cập nhật current_stock của nguyên vật liệu
    const { error: updateStockError } = await client
      .from('ingredients')
      .update({
        current_stock: newStock,
        updated_at: new Date().toISOString(),
      })
      .eq('id', dto.ingredient_id);

    if (updateStockError) {
      throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', updateStockError.message);
    }

    // 3. Ghi nhật ký biến động kho (ledger)
    const branchId = dto.branch_id ?? user.branch_id ?? null;
    const { data: tx, error: txError } = await client
      .from('inventory_transactions')
      .insert({
        tenant_id: user.tenant_id,
        branch_id: branchId,
        ingredient_id: dto.ingredient_id,
        type: dto.type,
        quantity: qty,
        balance_after: newStock,
        notes: dto.notes ?? null,
        created_by: appUserId,
      })
      .select()
      .single();

    if (txError) {
      // Revert stock update nếu ghi transaction thất bại
      await client
        .from('ingredients')
        .update({ current_stock: currentStock })
        .eq('id', dto.ingredient_id);
      throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', `Lỗi khi ghi nhận giao dịch kho: ${txError.message}`);
    }

    // 4. Trigger event realtime nếu tồn kho xuống dưới mức cảnh báo hoặc về 0
    const minAlert = Number(ingredient.min_stock_alert || 0);
    if (newStock <= minAlert || newStock <= 0) {
      this.realtimeGateway?.emitProductOutOfStock(branchId, {
        ingredient_id: ingredient.id,
        ingredient_name: ingredient.name,
        current_stock: newStock,
        tenant_id: user.tenant_id,
        branch_id: branchId,
      });
    }

    return tx;
  }

  private async resolvePublicUserId(client: any, user: AuthenticatedUser): Promise<string> {
    const { data: appUser, error } = await client
      .from('users')
      .select('id')
      .eq('auth_user_id', user.sub)
      .eq('tenant_id', user.tenant_id)
      .maybeSingle();

    if (error) {
      throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', error.message);
    }
    if (!appUser) {
      throw new AppException('ERR_1001_UNAUTHORIZED', 'Không tìm thấy thông tin tài khoản người dùng');
    }

    return appUser.id;
  }

  async listTransactions(accessToken: string, query: ListTransactionsQueryDto) {
    const client = this.supabase.forUser(accessToken);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;

    let builder = client
      .from('inventory_transactions')
      .select('*, ingredients(name, unit)', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (query.ingredient_id) {
      builder = builder.eq('ingredient_id', query.ingredient_id);
    }
    if (query.branch_id) {
      builder = builder.eq('branch_id', query.branch_id);
    }
    if (query.type) {
      builder = builder.eq('type', query.type);
    }

    builder = builder.range(offset, offset + limit - 1);

    const { data, count, error } = await builder;
    if (error) throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', error.message);

    return {
      data: data ?? [],
      meta: {
        total: count ?? 0,
        page,
        limit,
      },
    };
  }

  /**
   * ── 4. ATOMIC INVENTORY CONSUMPTION CHO ĐƠN HÀNG HOÀN TẤT ──
   * B1 DEPENDENCY & BLOCKER:
   * Để đảm bảo trừ kho all-or-nothing và chống double-deduction (idempotency),
   * B2 bắt buộc gọi atomic RPC từ database. Nếu B1 chưa bàn giao RPC này,
   * B2 không được tự chia nhỏ thành nhiều HTTP update gây lệch kho.
   */
  async consumeForCompletedOrder(
    accessToken: string,
    user: AuthenticatedUser,
    orderId: string,
  ) {
    const supabaseAdmin = this.supabase.admin();

    const { data: result, error: rpcError } = await supabaseAdmin.rpc(
      'fn_consume_inventory_for_order',
      {
        p_tenant_id: user.tenant_id,
        p_branch_id: user.branch_id,
        p_order_id: orderId,
      },
    );

    if (rpcError) {
      throw new AppException(
        'ERR_9002_INTERNAL_SERVER_ERROR',
        `BLOCKED BY B1: Thiếu hàm atomic RPC fn_consume_inventory_for_order (${rpcError.message})`,
      );
    }

    const rpcResult = result as {
      success: boolean;
      error_code?: string;
      message?: string;
      consumed_items?: Array<{
        ingredient_id: string;
        ingredient_name: string;
        current_stock: number;
        min_stock_alert: number;
        branch_id: string | null;
      }>;
    };

    if (!rpcResult?.success) {
      const errCode = (rpcResult?.error_code ?? 'ERR_9002_INTERNAL_SERVER_ERROR') as import('../../common/constants/error-codes.js').ErrorCode;
      throw new AppException(errCode, rpcResult?.message ?? 'Trừ kho thất bại');
    }

    // Emit realtime event nếu có nguyên liệu chạm ngưỡng cảnh báo
    if (rpcResult.consumed_items) {
      for (const item of rpcResult.consumed_items) {
        if (item.current_stock <= (item.min_stock_alert || 0) || item.current_stock <= 0) {
          this.realtimeGateway?.emitProductOutOfStock(item.branch_id, {
            ingredient_id: item.ingredient_id,
            ingredient_name: item.ingredient_name,
            current_stock: item.current_stock,
            tenant_id: user.tenant_id,
            branch_id: item.branch_id,
          });
        }
      }
    }

    return rpcResult;
  }
}
