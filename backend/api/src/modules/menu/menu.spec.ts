import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MenuService } from './menu.service.js';
import { MenuController } from './menu.controller.js';
import { CloudinaryService, type UploadedImageFile } from '../../common/cloudinary/cloudinary.service.js';
import { AppException } from '../../common/exceptions/app.exception.js';
import type { AuthenticatedUser } from '../../common/types/auth.types.js';

describe('Menu & Cloudinary Image Upload Tests', () => {
  let menuService: MenuService;
  let menuController: MenuController;
  let cloudinaryService: CloudinaryService;
  let mockSupabase: any;
  let mockSupabaseAdmin: any;

  const ownerUser: AuthenticatedUser = {
    sub: 'owner-sub',
    role_app: 'OWNER',
    tenant_id: '11111111-1111-1111-1111-111111111111',
    branch_id: null,
  };

  const staffUser: AuthenticatedUser = {
    sub: 'staff-sub',
    role_app: 'STAFF',
    tenant_id: '11111111-1111-1111-1111-111111111111',
    branch_id: 'branch-1',
  };

  beforeEach(() => {
    cloudinaryService = new CloudinaryService();

    mockSupabase = {
      from: vi.fn(),
    };
    mockSupabaseAdmin = {
      from: vi.fn(),
    };

    const mockSupabaseService: any = {
      forUser: () => mockSupabase,
      admin: () => mockSupabaseAdmin,
    };

    menuService = new MenuService(mockSupabaseService, cloudinaryService);
    menuController = new MenuController(menuService);
  });

  describe('CloudinaryService validation & upload', () => {
    it('should reject missing or empty file with ERR_9001_VALIDATION_FAILED', async () => {
      await expect(cloudinaryService.uploadImage(null as any)).rejects.toThrow(AppException);
      await expect(cloudinaryService.uploadImage({ buffer: null } as any)).rejects.toThrow(AppException);
    });

    it('should reject unsupported MIME type with ERR_9001_VALIDATION_FAILED', async () => {
      const invalidFile: UploadedImageFile = {
        mimetype: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('dummy-pdf-content'),
      };

      await expect(cloudinaryService.uploadImage(invalidFile)).rejects.toThrow(AppException);
      try {
        await cloudinaryService.uploadImage(invalidFile);
      } catch (err: any) {
        expect(err.code).toBe('ERR_9001_VALIDATION_FAILED');
        expect(err.message).toContain('Định dạng file không hợp lệ');
      }
    });

    it('should reject files exceeding 5MB max size', async () => {
      const oversizedFile: UploadedImageFile = {
        mimetype: 'image/jpeg',
        size: 6 * 1024 * 1024, // 6MB
        buffer: Buffer.alloc(100),
      };

      await expect(cloudinaryService.uploadImage(oversizedFile)).rejects.toThrow(AppException);
      try {
        await cloudinaryService.uploadImage(oversizedFile);
      } catch (err: any) {
        expect(err.code).toBe('ERR_9001_VALIDATION_FAILED');
        expect(err.message).toContain('vượt quá giới hạn cho phép');
      }
    });

    it('should successfully upload valid image file (JPEG, PNG, WEBP) and return secure_url', async () => {
      const validJpg: UploadedImageFile = {
        mimetype: 'image/jpeg',
        size: 100 * 1024, // 100KB
        buffer: Buffer.from('mock-jpeg-binary-data'),
        originalname: 'latte.jpg',
      };

      const result = await cloudinaryService.uploadImage(validJpg);
      expect(result).toHaveProperty('secure_url');
      expect(result).toHaveProperty('public_id');
      expect(result.secure_url).toMatch(/^https:\/\/res\.cloudinary\.com\//);
      expect(result.public_id).toContain('products/');
    });
  });

  describe('MenuController & MenuService product image support', () => {
    it('should upload image via controller endpoint', async () => {
      const validWebp: UploadedImageFile = {
        mimetype: 'image/webp',
        size: 50 * 1024,
        buffer: Buffer.from('mock-webp-data'),
        originalname: 'croissant.webp',
      };

      const result = await menuController.uploadProductImage(validWebp);
      expect(result.secure_url).toBeTruthy();
      expect(result.public_id).toBeTruthy();
    });

    it('should create product with image_url and persist', async () => {
      const newProductPayload = {
        name: 'Trà đào cam sả',
        price: 35000,
        category_id: '44444444-4444-4444-4444-444444444444',
        image_url: 'https://res.cloudinary.com/fnb-demo/image/upload/v1/products/tra-dao.jpg',
      };

      const insertMock = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'prod-123',
            ...newProductPayload,
            tenant_id: ownerUser.tenant_id,
            is_active: true,
          },
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(insertMock);

      const created = await menuController.createProduct(newProductPayload, ownerUser, 'token');
      expect(created.image_url).toBe(newProductPayload.image_url);
      expect(insertMock.insert).toHaveBeenCalledWith({
        ...newProductPayload,
        tenant_id: ownerUser.tenant_id,
      });
    });

    it('should update product with new image_url', async () => {
      const updatePayload = {
        image_url: 'https://res.cloudinary.com/fnb-demo/image/upload/v2/products/updated-tra-dao.jpg',
      };

      const updateMock = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            id: 'prod-123',
            name: 'Trà đào cam sả',
            price: 35000,
            image_url: updatePayload.image_url,
          },
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(updateMock);

      const updated = await menuController.updateProduct('prod-123', updatePayload, 'token');
      expect(updated.image_url).toBe(updatePayload.image_url);
      expect(updateMock.update).toHaveBeenCalledWith(updatePayload);
    });

    it('should include image_url in listProducts query', async () => {
      const selectMock = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'prod-1',
              name: 'Cà phê đen',
              price: 25000,
              image_url: 'https://res.cloudinary.com/fnb-demo/image/upload/v1/caphe.jpg',
            },
          ],
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(selectMock);

      const products = await menuController.listProducts({}, staffUser, 'token');
      expect(selectMock.select).toHaveBeenCalledWith(expect.stringContaining('image_url'));
      expect(products[0].image_url).toBe('https://res.cloudinary.com/fnb-demo/image/upload/v1/caphe.jpg');
    });

    it('should include image_url in public catalog query for customers', async () => {
      mockSupabaseAdmin.from.mockImplementation((table: string) => {
        if (table === 'tenants') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: 'tenant-1', name: 'The Coffee Shop', subdomain: 'coffee' },
              error: null,
            }),
          };
        }
        if (table === 'categories') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [{ id: 'cat-1', name: 'Cà phê', kitchen_station: 'BAR' }],
              error: null,
            }),
          };
        }
        if (table === 'products') {
          return {
            select: vi.fn().mockImplementation((fields: string) => {
              expect(fields).toContain('image_url');
              return {
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({
                  data: [
                    {
                      id: 'p-1',
                      category_id: 'cat-1',
                      name: 'Bạc xỉu',
                      price: 32000,
                      image_url: 'https://res.cloudinary.com/fnb-demo/image/upload/v1/bac-xiu.jpg',
                    },
                  ],
                  error: null,
                }),
              };
            }),
          };
        }
        return {};
      });

      const catalog = await menuController.getPublicCatalog({ tenant_subdomain: 'coffee' });
      expect(catalog.products).toHaveLength(1);
      expect(catalog.products[0].image_url).toBe('https://res.cloudinary.com/fnb-demo/image/upload/v1/bac-xiu.jpg');
    });
  });
});
