import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReservationService } from './reservation.service.js';
import { ReservationController } from './reservation.controller.js';
import { FloorService } from '../floor/floor.service.js';
import { AppException } from '../../common/exceptions/app.exception.js';
import type { AuthenticatedUser } from '../../common/types/auth.types.js';

describe('Reservation Check-In, Staff Retrieval & Cancellation Consistency Tests', () => {
  let reservationService: ReservationService;
  let reservationController: ReservationController;
  let floorService: FloorService;

  let mockSupabaseAdmin: any;
  let mockSupabaseUser: any;
  let mockRedisClient: any;
  let mockRealtimeGateway: any;

  const tenantId = '11111111-1111-1111-1111-111111111111';
  const branchId = '22222222-2222-2222-2222-222222222222';
  const tableId = '33333333-3333-3333-3333-333333333333';
  const floorId = '44444444-4444-4444-4444-444444444444';

  const staffUser: AuthenticatedUser = {
    sub: 'staff-auth-id',
    role_app: 'STAFF',
    tenant_id: tenantId,
    branch_id: branchId,
  };

  const customerUser: AuthenticatedUser = {
    sub: 'cust-auth-id',
    role_app: 'CUSTOMER',
    tenant_id: tenantId,
    branch_id: null,
  };

  beforeEach(() => {
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

    reservationService = new ReservationService(
      mockSupabaseService,
      mockRedisService,
      mockRealtimeGateway,
    );
    reservationController = new ReservationController(reservationService);
    floorService = new FloorService(mockSupabaseService);
  });

  describe('Staff Check-In', () => {
    it('should successfully check-in customer via reservation code and auto-create order', async () => {
      const reservation = {
        id: 'res-uuid-1',
        tenant_id: tenantId,
        table_id: tableId,
        customer_id: 'cust-uuid-1',
        customer_name: 'Nguyễn Văn A',
        customer_phone: '0901234567',
        reservation_code: 'RES_ABC123',
        deposit_amount: 50000,
        status: 'PAID',
      };

      const tableData = {
        id: tableId,
        floor_id: floorId,
        status: 'RESERVED',
        current_order_id: null,
      };

      const createdOrder = {
        id: 'order-uuid-99',
        tenant_id: tenantId,
        branch_id: branchId,
        table_id: tableId,
        customer_id: 'cust-uuid-1',
        order_code: 'ORD_TEST99',
        status: 'PENDING',
        discount_amount: 50000,
      };

      mockSupabaseAdmin.from.mockImplementation((table: string) => {
        if (table === 'reservations') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: reservation, error: null }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        if (table === 'tables') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: tableData, error: null }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        if (table === 'floors') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { branch_id: branchId }, error: null }),
          };
        }
        if (table === 'orders') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: createdOrder, error: null }),
              }),
            }),
          };
        }
        return {};
      });

      const result = await reservationController.checkIn(staffUser, 'RES_ABC123');

      expect(result.message).toBe('Check-in thành công');
      expect(result.reservation.status).toBe('CHECKED_IN');
      expect(result.order.id).toBe('order-uuid-99');
      expect(result.order.discount_amount).toBe(50000);
      expect(mockRealtimeGateway.emitTableStatusChanged).toHaveBeenCalledWith(tableId, 'OCCUPIED');
    });

    it('should reject check-in if reservation is not found or not in PAID/PENDING state', async () => {
      mockSupabaseAdmin.from.mockImplementation((table: string) => {
        if (table === 'reservations') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { status: 'CANCELLED', reservation_code: 'RES_CANCELLED' },
              error: null,
            }),
          };
        }
        return {};
      });

      await expect(
        reservationController.checkIn(staffUser, 'RES_CANCELLED'),
      ).rejects.toThrow(AppException);
    });

    it('should handle already CHECKED_IN reservation idempotently', async () => {
      const checkedInReservation = {
        id: 'res-uuid-1',
        tenant_id: tenantId,
        table_id: tableId,
        reservation_code: 'RES_CHECKED_IN',
        status: 'CHECKED_IN',
      };

      mockSupabaseAdmin.from.mockImplementation((table: string) => {
        if (table === 'reservations') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: checkedInReservation, error: null }),
          };
        }
        return {};
      });

      const result = await reservationController.checkIn(staffUser, 'RES_CHECKED_IN');
      expect(result.message).toContain('trước đó');
      expect(result.reservation.status).toBe('CHECKED_IN');
    });
  });

  describe('Staff Reservation Retrieval & Floor Enrichment', () => {
    it('should list reservations filtered by status or table for staff', async () => {
      const mockList = [
        {
          id: 'res-1',
          reservation_code: 'RES_001',
          status: 'PAID',
          customer_name: 'Khách 1',
        },
      ];

      mockSupabaseAdmin.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockList, error: null }),
      });

      const list = await reservationController.listReservations(staffUser, { status: 'PAID' });
      expect(list).toEqual(mockList);
    });

    it('should enrich RESERVED tables with customer name, phone, reservation_time in getFloorTables', async () => {
      const rawTables = [
        {
          id: 'table-1',
          floor_id: floorId,
          table_code: 'Bàn 01',
          status: 'AVAILABLE',
        },
        {
          id: 'table-2',
          floor_id: floorId,
          table_code: 'Bàn 02',
          status: 'RESERVED',
        },
      ];

      mockSupabaseUser.from.mockImplementation((table: string) => {
        if (table === 'tables') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: rawTables, error: null }),
          };
        }
        return {};
      });

      mockSupabaseAdmin.from.mockImplementation((table: string) => {
        if (table === 'reservations') {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [
                {
                  id: 'res-t2',
                  table_id: 'table-2',
                  customer_name: 'Trần Thị B',
                  customer_phone: '0988888888',
                  reservation_time: '2026-09-25T14:00:00Z',
                  reservation_code: 'RES_T2',
                  deposit_amount: 50000,
                },
              ],
              error: null,
            }),
          };
        }
        return {};
      });

      const tables = await floorService.getFloorTables('token', floorId);
      expect(tables).toHaveLength(2);
      expect(tables[0].status).toBe('AVAILABLE');
      expect(tables[0]).not.toHaveProperty('customer_name');

      // Table 2 is RESERVED and enriched
      expect(tables[1].status).toBe('RESERVED');
      expect(tables[1].customer_name).toBe('Trần Thị B');
      expect(tables[1].customer_phone).toBe('0988888888');
      expect(tables[1].reservation_code).toBe('RES_T2');
    });
  });

  describe('Auto-cancellation after 1 hour consistency', () => {
    it('should update both reservation and table status to CANCELLED and AVAILABLE', async () => {
      const expiredRes = [
        {
          id: 'res-expired-1',
          table_id: tableId,
          reservation_code: 'RES_EXP1',
        },
      ];

      const resUpdateMock = {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      };

      const tableUpdateMock = {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          lt: vi.fn().mockResolvedValue({ error: null }),
        }),
      };

      mockSupabaseAdmin.from.mockImplementation((table: string) => {
        if (table === 'reservations') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            lt: vi.fn().mockResolvedValue({ data: expiredRes, error: null }),
            update: resUpdateMock.update,
          };
        }
        if (table === 'tables') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            lt: vi.fn().mockResolvedValue({ data: [], error: null }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
            }),
          };
        }
        return {};
      });

      await reservationService.clearExpiredReservations();

      expect(resUpdateMock.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'CANCELLED' }),
      );
      expect(mockRealtimeGateway.emitTableStatusChanged).toHaveBeenCalledWith(tableId, 'AVAILABLE');
    });
  });
});
