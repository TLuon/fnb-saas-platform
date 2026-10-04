import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.service.js';
import { AppException } from '../../common/exceptions/app.exception.js';
import { RoleApp } from '../../common/types/auth.types.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { CloudinaryService, type UploadedImageFile } from '../../common/cloudinary/cloudinary.service.js';

@Injectable()
export class MenuService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  /** API_CONTRACT.md mục 3 — GET /categories. RLS tự lọc theo tenant. */
  async listCategories(accessToken: string) {
    const client = this.supabase.forUser(accessToken);
    const { data, error } = await client
      .from('categories')
      .select('id, name, kitchen_station, created_at')
      .order('name', { ascending: true });

    if (error) throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', error.message);
    return data;
  }

  /** API_CONTRACT.md mục 3 — POST /categories (OWNER). tenant_id lấy từ JWT qua RLS policy WITH CHECK, không nhận từ client. */
  async createCategory(accessToken: string, tenantId: string, dto: CreateCategoryDto) {
    const client = this.supabase.forUser(accessToken);
    const { data, error } = await client
      .from('categories')
      .insert({ ...dto, tenant_id: tenantId })
      .select()
      .single();

    if (error) throw new AppException('ERR_9001_VALIDATION_FAILED', error.message);
    return data;
  }

  /** API_CONTRACT.md mục 3 — PATCH /categories/:id (OWNER). */
  async updateCategory(accessToken: string, id: string, dto: UpdateCategoryDto) {
    const client = this.supabase.forUser(accessToken);
    const { data, error } = await client
      .from('categories')
      .update(dto)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) throw new AppException('ERR_9001_VALIDATION_FAILED', error.message);
    if (!data) throw new AppException('ERR_7001_CATEGORY_NOT_FOUND', 'Không tìm thấy danh mục');
    return data;
  }

  /**
   * API_CONTRACT.md mục 3 — DELETE /categories/:id (OWNER).
   * ERR_7003_CATEGORY_HAS_PRODUCTS nếu còn products.is_active=true thuộc danh mục.
   */
  async deleteCategory(accessToken: string, id: string) {
    const client = this.supabase.forUser(accessToken);

    const { count, error: countError } = await client
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', id)
      .eq('is_active', true);

    if (countError) throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', countError.message);
    if (count && count > 0) {
      throw new AppException(
        'ERR_7003_CATEGORY_HAS_PRODUCTS',
        'Không thể xóa danh mục còn món đang bán',
      );
    }

    const { error, count: deletedCount } = await client
      .from('categories')
      .delete({ count: 'exact' })
      .eq('id', id);

    if (error) throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', error.message);
    if (!deletedCount) throw new AppException('ERR_7001_CATEGORY_NOT_FOUND', 'Không tìm thấy danh mục');
    return { deleted: true };
  }

  /**
   * API_CONTRACT.md mục 3 — GET /products?category_id=.
   * "CUSTOMER chỉ thấy is_active = true" — OWNER/STAFF thấy cả món đã
   * ẩn để phục vụ Menu Management.
   */
  async listProducts(accessToken: string, role: RoleApp, categoryId?: string) {
    const client = this.supabase.forUser(accessToken);
    let query = client
      .from('products')
      .select('id, name, price, category_id, is_active, default_modifiers, image_url, created_at')
      .order('name', { ascending: true });

    if (categoryId) query = query.eq('category_id', categoryId);
    if (role === 'CUSTOMER') query = query.eq('is_active', true);

    const { data, error } = await query;
    if (error) throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', error.message);
    return data;
  }

  /** API_CONTRACT.md mục 3 — POST /products (OWNER). */
  async createProduct(accessToken: string, tenantId: string, dto: CreateProductDto) {
    const client = this.supabase.forUser(accessToken);
    const { data, error } = await client
      .from('products')
      .insert({ ...dto, tenant_id: tenantId })
      .select()
      .single();

    if (error) throw new AppException('ERR_9001_VALIDATION_FAILED', error.message);
    return data;
  }

  /** API_CONTRACT.md mục 3 — PATCH /products/:id (OWNER). */
  async updateProduct(accessToken: string, id: string, dto: UpdateProductDto) {
    const client = this.supabase.forUser(accessToken);
    const { data, error } = await client
      .from('products')
      .update(dto)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) throw new AppException('ERR_9001_VALIDATION_FAILED', error.message);
    if (!data) throw new AppException('ERR_7002_PRODUCT_NOT_FOUND', 'Không tìm thấy món');
    return data;
  }

  /**
   * API_CONTRACT.md mục 3 — DELETE /products/:id (OWNER).
   * "Vô hiệu hóa món (soft-delete qua is_active = false — không xóa
   * cứng vì order_items đã tham chiếu product_id)".
   */
  async deactivateProduct(accessToken: string, id: string) {
    const client = this.supabase.forUser(accessToken);
    
    // Attempt hard delete first
    const { data: deleteData, error: deleteError } = await client
      .from('products')
      .delete()
      .eq('id', id)
      .select()
      .maybeSingle();

    if (!deleteError && deleteData) {
      return deleteData;
    }

    // If it fails (likely due to foreign key constraint from order_items), do a soft-delete
    const { data, error } = await client
      .from('products')
      .update({ is_active: false })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', error.message);
    if (!data) throw new AppException('ERR_7002_PRODUCT_NOT_FOUND', 'Không tìm thấy món');
    return data;
  }

  /**
   * B1.md P2.3 — GET /public/catalog?tenant_subdomain=&branch_id=
   * Endpoint công khai cho khách vãng lai xem menu mà không cần JWT.
   * Resolve tenant bằng tenant_subdomain, kiểm tra branch_id nếu có.
   * Chỉ trả danh mục và món ăn đang active.
   */
  async getPublicCatalog(subdomain: string, branchId?: string) {
    const admin = this.supabase.admin();

    // 1. Resolve tenant
    const { data: tenant, error: tenantError } = await admin
      .from('tenants')
      .select('id, name, subdomain')
      .eq('subdomain', subdomain)
      .maybeSingle();

    if (tenantError) throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', tenantError.message);
    if (!tenant) throw new AppException('ERR_1001_UNAUTHORIZED', 'Quán không tồn tại hoặc tên miền không đúng');

    // 2. Kiểm tra branch_id nếu có truyền lên
    if (branchId) {
      const { data: branch, error: branchError } = await admin
        .from('branches')
        .select('id')
        .eq('id', branchId)
        .eq('tenant_id', tenant.id)
        .maybeSingle();

      if (branchError) throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', branchError.message);
      if (!branch) throw new AppException('ERR_9001_VALIDATION_FAILED', 'Chi nhánh không hợp lệ hoặc không thuộc quán');
    }

    // 3. Lấy categories
    const { data: categories, error: catError } = await admin
      .from('categories')
      .select('id, name, kitchen_station')
      .eq('tenant_id', tenant.id)
      .order('name', { ascending: true });

    if (catError) throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', catError.message);

    // 4. Lấy products đang active
    const { data: products, error: prodError } = await admin
      .from('products')
      .select('id, category_id, name, price, default_modifiers, image_url')
      .eq('tenant_id', tenant.id)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (prodError) throw new AppException('ERR_9002_INTERNAL_SERVER_ERROR', prodError.message);

    return {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        subdomain: tenant.subdomain,
      },
      categories: categories ?? [],
      products: products ?? [],
    };
  }

  /** Upload product image to Cloudinary */
  async uploadImage(file: UploadedImageFile) {
    return this.cloudinaryService.uploadImage(file, 'products');
  }
}
