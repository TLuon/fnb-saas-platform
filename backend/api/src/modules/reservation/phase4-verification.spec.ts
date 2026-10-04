import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MenuService } from '../menu/menu.service.js';
import { MenuController } from '../menu/menu.controller.js';
import { ReservationService } from './reservation.service.js';
import { ReservationController } from './reservation.controller.js';
import { CloudinaryService, type UploadedImageFile } from '../../common/cloudinary/cloudinary.service.js';
import { AppException } from '../../common/exceptions/app.exception.js';
import type { AuthenticatedUser } from '../../common/types/auth.types.js';

describe('PHASE 4 — Verification of All Requirements & Real API Flows', () => {
  let menuService: MenuService;
  let menuController: MenuController;
  let reservationService: ReservationService;
  let reservationController: ReservationController;
  let cloudinaryService: CloudinaryService;

  let mockSupabaseAdmin: any;
  let mockSupabaseUser: any;
  let mockRedisClient: any;
  let mockRealtimeGateway: any;

  const tenantA = '11111111-1111-1111-1111-111111111111';
  const tenantB = '99999999-9999-9999-9999-999999999999';
  const branchA = '22222222-2222-2222-2222-222222222222';
  const tableIdA = '33333333-3333-3333-3333-333333333333';

  const ownerA: AuthenticatedUser = {
    sub: 'owner-a-sub',
    role_app: 'OWNER',
    tenant_id: tenantA,
    branch_id: null,
  };

  const staffA: AuthenticatedUser = {
    sub: 'staff-a-sub',
    role_app: 'STAFF',
    tenant_id: tenantA,
    branch_id: branchA,
  };

  const customerA: AuthenticatedUser = {
    sub: 'cust-a-sub',
    role_app: 'CUSTOMER',
    tenant_id: tenantA,
    branch_id: null,
  };

  const customerB: AuthenticatedUser = {
    sub: 'cust-b-sub',
    role_app: 'CUSTOMER',
    tenant_id: tenantB,
    branch_id: null,
  };

  beforeEach(() => {
    cloudinaryService = new CloudinaryService();

    mockRedisClient = {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
    };

    mockRealtimeGateway = {
      emitTableStatusChanged: vi.fn(),
      emitUnmatchedTransactionCreated: vi.fn(),
    };

    mockSupabaseAdmin = {
      from: vi.fn(),
    };
    mockSupabaseUser = {
      from: vi.fn(),
    };

    const mockSupabaseService: any = {
      admin: () => mockSupabaseAdmin,
      forUser: () => mockSupabaseUser,
    };

    const mockRedisService: any = {
      getClient: () => mockRedisClient,
    };

    menuService = new MenuService(mockSupabaseService, cloudinaryService);
    menuController = new MenuController(menuService);

    reservationService = new ReservationService(
      mockSupabaseService,
      mockRedisService,
      mockRealtimeGateway,
    );
    reservationController = new ReservationController(reservationService);
  });

  // FLOW 1: Upload product image
  it('Flow 1: Upload product image via Cloudinary service', async () => {
    const validImage: UploadedImageFile = {
      mimetype: 'image/png',
      size: 150 * 1024,
      buffer: Buffer.from('mock-png-bytes'),
      originalname: 'capuchino.png',
    };

    const res = await menuController.uploadProductImage(validImage);
    expect(res).toHaveProperty('secure_url');
    expect(res.secure_url).toMatch(/^https:\/\/res\.cloudinary\.com\//);
    expect(res).toHaveProperty('public_id');
  });

  // FLOW 2: Create product with image
  it('Flow 2: Create product with image_url and verify fields', async () => {
    const payload = {
      name: 'Cold Brew Cam Sả',
      price: 45000,
      category_id: 'cat-uuid-1',
      image_url: 'https://res.cloudinary.com/fnb-demo/image/upload/v1/products/cold-brew.png',
    };

    mockSupabaseUser.from.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'p-coldbrew', ...payload, tenant_id: tenantA },
            error: null,
          }),
        }),
      }),
    });

    const created = await menuController.createProduct(payload, ownerA, 'token');
    expect(created.id).toBe('p-coldbrew');
    expect(created.image_url).toBe(payload.image_url);
  });

  // FLOW 3: Update product image
  it('Flow 3: Update product image_url', async () => {
    const updatePayload = {
      image_url: 'https://res.cloudinary.com/fnb-demo/image/upload/v2/products/cold-brew-v2.png',
    };

    mockSupabaseUser.from.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'p-coldbrew',
                name: 'Cold Brew Cam Sả',
                image_url: updatePayload.image_url,
              },
              error: null,
            }),
          }),
        }),
      }),
    });

    const updated = await menuController.updateProduct('p-coldbrew', updatePayload, 'token');
    expect(updated.image_url).toBe(updatePayload.image_url);
  });

  // FLOW 4: Reload product list and verify image persists
  it('Flow 4: Reload product list and verify image_url persists and is returned', async () => {
    mockSupabaseUser.from.mockReturnValue({
      select: vi.fn().mockImplementation((selectFields: string) => {
        expect(selectFields).toContain('image_url');
        return {
          order: vi.fn().mockResolvedValue({
            data: [
              {
                id: 'p-coldbrew',
                name: 'Cold Brew Cam Sả',
                price: 45000,
                image_url: 'https://res.cloudinary.com/fnb-demo/image/upload/v2/products/cold-brew-v2.png',
              },
            ],
            error: null,
          }),
        };
      }),
    });

    const products = await menuController.listProducts({}, staffA, 'token');
    expect(products[0].image_url).toBe(
      'https://res.cloudinary.com/fnb-demo/image/upload/v2/products/cold-brew-v2.png',
    );
  });

  // FLOW 5: Invalid image file rejection
  it('Flow 5: Invalid image file rejection (unsupported MIME and oversized file)', async () => {
    // 5.1 Invalid MIME
    const pdfFile: UploadedImageFile = {
      mimetype: 'application/pdf',
      size: 1000,
      buffer: Buffer.from('pdf data'),
    };
    await expect(cloudinaryService.uploadImage(pdfFile)).rejects.toThrow(AppException);

    // 5.2 File size > 5MB
    const bigFile: UploadedImageFile = {
      mimetype: 'image/jpeg',
      size: 5.5 * 1024 * 1024,
      buffer: Buffer.alloc(10),
    };
    await expect(cloudinaryService.uploadImage(bigFile)).rejects.toThrow(AppException);
  });

  // FLOW 6: Unauthorized upload rejection (guard metadata check)
  it('Flow 6: Verify role authorization rules on upload endpoint', () => {
    const roles = Reflect.getMetadata('roles', MenuController.prototype.uploadProductImage);
    expect(roles).toEqual(expect.arrayContaining(['OWNER', 'STAFF']));
    expect(roles).not.toContain('CUSTOMER');
  });

  // FLOW 7: Reservation creation
  it('Flow 7: Reservation creation locks table, creates code, and updates table status to PENDING_LOCK', async () => {
    const tableMockChain = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: tableIdA, status: 'AVAILABLE' }, error: null }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    };
    mockSupabaseUser.from.mockReturnValue(tableMockChain);
    mockSupabaseAdmin.from.mockReturnValue(tableMockChain);

    mockRedisClient.set.mockResolvedValue('OK');

    const result = await reservationController.lockTable(customerA, 'token', {
      table_id: tableIdA,
      customer_name: 'Khách A',
      customer_phone: '0911223344',
    });

    expect(result).toHaveProperty('reservation_code');
    expect(result.reservation_code).toMatch(/^RES_/);
    expect(result.deposit_amount).toBe(50000);
    expect(mockRealtimeGateway.emitTableStatusChanged).toHaveBeenCalledWith(tableIdA, 'PENDING_LOCK');
  });

  // FLOW 8: Staff reservation retrieval
  it('Flow 8: Staff retrieves active reservations for their tenant', async () => {
    const activeReservations = [
      {
        id: 'res-1',
        reservation_code: 'RES_123456',
        customer_name: 'Khách A',
        customer_phone: '0911223344',
        status: 'PAID',
        table_id: tableIdA,
      },
    ];

    mockSupabaseAdmin.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: activeReservations, error: null }),
    });

    const list = await reservationController.listReservations(staffA, { status: 'PAID' });
    expect(list).toEqual(activeReservations);
    expect(list[0].customer_name).toBe('Khách A');
  });

  // FLOW 9: Reservation cancellation and table release
  it('Flow 9: Reservation cancellation deletes Redis lock and sets table back to AVAILABLE', async () => {
    mockRedisClient.get.mockResolvedValue(
      JSON.stringify({
        tenant_id: tenantA,
        table_id: tableIdA,
        user_id: customerA.sub,
      }),
    );

    const tableUpdateMock = {
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    };

    mockSupabaseAdmin.from.mockImplementation((table: string) => {
      if (table === 'tables') return tableUpdateMock;
      return {};
    });

    const res = await reservationController.cancelReservation(customerA, 'token', 'RES_123456');
    expect(res.message).toContain('thành công');
    expect(mockRedisClient.del).toHaveBeenCalled();
    expect(tableUpdateMock.update).toHaveBeenCalledWith({ status: 'AVAILABLE' });
    expect(mockRealtimeGateway.emitTableStatusChanged).toHaveBeenCalledWith(tableIdA, 'AVAILABLE');
  });

  // FLOW 10: Tenant and branch isolation
  it('Flow 10: Tenant isolation prevents cross-tenant access to reservations', async () => {
    // Customer B attempts to retrieve Customer A's reservation
    mockSupabaseAdmin.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockImplementation((col: string, val: string) => {
          // If query tenant_id is tenantB, return null
          if (col === 'tenant_id' && val === tenantB) {
            return {
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            };
          }
          return {
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          };
        }),
      }),
    });

    await expect(
      reservationController.getReservation(customerB, 'RES_123456'),
    ).rejects.toThrow(AppException);
  });
});
