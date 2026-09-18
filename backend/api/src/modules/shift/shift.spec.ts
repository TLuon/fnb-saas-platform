import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Reflector } from '@nestjs/core';
import { ShiftService } from './shift.service.js';
import { ShiftController } from './shift.controller.js';
import { AppException } from '../../common/exceptions/app.exception.js';
import type { AuthenticatedUser } from '../../common/types/auth.types.js';

describe('ShiftModule Tests', () => {
  let service: ShiftService;
  let controller: ShiftController;
  let mockSupabase: any;
  let mockAdminSupabase: any;

  const tenantId = '11111111-1111-1111-1111-111111111111';
  const branchId = '22222222-2222-2222-2222-222222222222';
  const otherBranchId = '33333333-3333-3333-3333-333333333333';
  const publicUserId = '99999999-9999-9999-9999-999999999999';
  const ownerPublicUserId = '88888888-8888-8888-8888-888888888888';

  const staffUser: AuthenticatedUser = {
    sub: 'staff-user-1',
    role_app: 'STAFF',
    tenant_id: tenantId,
    branch_id: branchId,
  };

  const ownerUser: AuthenticatedUser = {
    sub: 'owner-user-1',
    role_app: 'OWNER',
    tenant_id: tenantId,
    branch_id: branchId,
  };

  const staffUserWithoutBranch: AuthenticatedUser = {
    sub: 'staff-user-2',
    role_app: 'STAFF',
    tenant_id: tenantId,
    branch_id: null,
  };

  const ownerUserWithoutBranch: AuthenticatedUser = {
    sub: 'owner-user-2',
    role_app: 'OWNER',
    tenant_id: tenantId,
    branch_id: null,
  };

  const createMockUserQuery = (userResult: any = { id: publicUserId }, error: any = null) => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: userResult, error }),
  });

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn(),
    };
    mockAdminSupabase = {
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: null }),
      }),
    };

    const mockSupabaseService: any = {
      forUser: () => mockSupabase,
      admin: () => mockAdminSupabase,
    };

    service = new ShiftService(mockSupabaseService);
    controller = new ShiftController(service);
  });

  describe('ShiftController Role Metadata', () => {
    const reflector = new Reflector();

    it('should configure OWNER and STAFF roles on all shift endpoints', () => {
      expect(reflector.get('roles', controller.openShift)).toEqual(['OWNER', 'STAFF']);
      expect(reflector.get('roles', controller.closeShift)).toEqual(['OWNER', 'STAFF']);
      expect(reflector.get('roles', controller.getCurrentShift)).toEqual(['OWNER', 'STAFF']);
      expect(reflector.get('roles', controller.listShifts)).toEqual(['OWNER', 'STAFF']);
    });
  });

  describe('ShiftService.openShift', () => {
    it('should open a new shift successfully, resolving public.users.id from auth_user_id and using it for opened_by', async () => {
      const shiftCheckQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      };

      const userResolveQuery = createMockUserQuery({ id: publicUserId });

      const shiftInsertQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'shift-1',
            tenant_id: tenantId,
            branch_id: branchId,
            status: 'OPEN',
            opened_by: publicUserId,
            starting_cash: 500000,
          },
          error: null,
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(shiftCheckQuery)
        .mockReturnValueOnce(userResolveQuery)
        .mockReturnValueOnce(shiftInsertQuery);

      const result = await service.openShift('token', staffUser, {
        branch_id: branchId,
        starting_cash: 500000,
        notes: 'Mở ca sáng',
      });

      expect(result.id).toBe('shift-1');
      expect(result.status).toBe('OPEN');

      // Verify resolution of public.users.id
      expect(userResolveQuery.select).toHaveBeenCalledWith('id');
      expect(userResolveQuery.eq).toHaveBeenCalledWith('auth_user_id', staffUser.sub);
      expect(userResolveQuery.eq).toHaveBeenCalledWith('tenant_id', staffUser.tenant_id);

      // Verify opened_by uses resolved public.users.id (NOT staffUser.sub)
      expect(shiftInsertQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          opened_by: publicUserId,
          tenant_id: tenantId,
          branch_id: branchId,
        }),
      );
      expect(shiftInsertQuery.insert).not.toHaveBeenCalledWith(
        expect.objectContaining({
          opened_by: staffUser.sub,
        }),
      );

      // Verify audit_logs keeps actor_user_id = user.sub
      expect(mockAdminSupabase.from).toHaveBeenCalledWith('audit_logs');
    });

    it('should reject openShift if no matching public user exists for auth_user_id', async () => {
      const shiftCheckQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
      const userResolveQuery = createMockUserQuery(null, null);

      mockSupabase.from
        .mockReturnValueOnce(shiftCheckQuery)
        .mockReturnValueOnce(userResolveQuery);

      await expect(
        service.openShift('token', staffUser, {
          branch_id: branchId,
          starting_cash: 100000,
        }),
      ).rejects.toMatchObject({
        code: 'ERR_1001_UNAUTHORIZED',
        message: 'Không tìm thấy thông tin tài khoản người dùng',
      });
    });

    it('should reject openShift if resolving public user throws DB error', async () => {
      const shiftCheckQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
      const userResolveQuery = createMockUserQuery(null, { message: 'Database error' });

      mockSupabase.from
        .mockReturnValueOnce(shiftCheckQuery)
        .mockReturnValueOnce(userResolveQuery);

      await expect(
        service.openShift('token', staffUser, {
          branch_id: branchId,
          starting_cash: 100000,
        }),
      ).rejects.toMatchObject({
        code: 'ERR_9002_INTERNAL_SERVER_ERROR',
      });
    });

    it('should reject openShift if the branch already has an active OPEN shift', async () => {
      const shiftCheckQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 'shift-existing', branch_id: branchId, status: 'OPEN' },
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(shiftCheckQuery);

      await expect(
        service.openShift('token', staffUser, {
          branch_id: branchId,
          starting_cash: 200000,
        }),
      ).rejects.toThrow(AppException);
    });

    it('should reject openShift if STAFF tries to open shift for another branch', async () => {
      await expect(
        service.openShift('token', staffUser, {
          branch_id: otherBranchId,
          starting_cash: 100000,
        }),
      ).rejects.toThrow(AppException);

      await expect(
        service.openShift('token', staffUser, {
          branch_id: otherBranchId,
          starting_cash: 100000,
        }),
      ).rejects.toMatchObject({
        code: 'ERR_9001_VALIDATION_FAILED',
        message: 'Nhân viên không có quyền mở ca cho chi nhánh khác',
      });
    });

    it('should reject openShift if STAFF has no branch_id assigned', async () => {
      await expect(
        service.openShift('token', staffUserWithoutBranch, {
          branch_id: branchId,
          starting_cash: 100000,
        }),
      ).rejects.toMatchObject({
        code: 'ERR_9001_VALIDATION_FAILED',
        message: 'Tài khoản chưa được gán chi nhánh',
      });
    });

    it('should allow OWNER to open shift for a specified branch using resolved public.users.id', async () => {
      const shiftCheckQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      };

      const userResolveQuery = createMockUserQuery({ id: ownerPublicUserId });

      const shiftInsertQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'shift-owner',
            tenant_id: tenantId,
            branch_id: otherBranchId,
            opened_by: ownerPublicUserId,
            status: 'OPEN',
            starting_cash: 300000,
          },
          error: null,
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(shiftCheckQuery)
        .mockReturnValueOnce(userResolveQuery)
        .mockReturnValueOnce(shiftInsertQuery);

      const result = await service.openShift('token', ownerUser, {
        branch_id: otherBranchId,
        starting_cash: 300000,
      });

      expect(result.id).toBe('shift-owner');
      expect(result.branch_id).toBe(otherBranchId);
      expect(shiftInsertQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          opened_by: ownerPublicUserId,
        }),
      );
    });
  });

  describe('ShiftService.closeShift & Cash Reconciliation', () => {
    it('should calculate expected cash based on starting cash + cash orders and update closed_by = public.users.id', async () => {
      const shiftFetchQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            id: 'shift-1',
            branch_id: branchId,
            starting_cash: 500000,
            status: 'OPEN',
            notes: 'Mở ca sáng',
          },
          error: null,
        }),
      };

      const userResolveQuery = createMockUserQuery({ id: publicUserId });

      const ordersQuery: any = Promise.resolve({
        data: [{ final_amount: 150000 }, { final_amount: 250000 }],
        error: null,
      });
      ordersQuery.select = vi.fn().mockReturnValue(ordersQuery);
      ordersQuery.eq = vi.fn().mockReturnValue(ordersQuery);

      const shiftUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'shift-1',
            status: 'CLOSED',
            closed_by: publicUserId,
            ending_cash: 900000,
          },
          error: null,
        }),
      };

      mockSupabase.from
        .mockReturnValueOnce(shiftFetchQuery)
        .mockReturnValueOnce(userResolveQuery)
        .mockReturnValueOnce(ordersQuery)
        .mockReturnValueOnce(shiftUpdateQuery);

      const result = await service.closeShift('token', staffUser, 'shift-1', {
        ending_cash: 900000,
        notes: 'Kiểm kê đủ',
      });

      // Starting cash 500k + Orders 400k = Expected 900k
      expect(result.expected_cash).toBe(900000);
      expect(result.actual_cash).toBe(900000);
      expect(result.difference).toBe(0);

      // Verify closed_by used public.users.id (NOT staffUser.sub)
      expect(userResolveQuery.select).toHaveBeenCalledWith('id');
      expect(userResolveQuery.eq).toHaveBeenCalledWith('auth_user_id', staffUser.sub);
      expect(userResolveQuery.eq).toHaveBeenCalledWith('tenant_id', staffUser.tenant_id);

      expect(shiftUpdateQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          closed_by: publicUserId,
          status: 'CLOSED',
        }),
      );
      expect(shiftUpdateQuery.update).not.toHaveBeenCalledWith(
        expect.objectContaining({
          closed_by: staffUser.sub,
        }),
      );

      expect(mockAdminSupabase.from).toHaveBeenCalledWith('audit_logs');
    });

    it('should reject closeShift if no matching public user exists for auth_user_id', async () => {
      const shiftFetchQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 'shift-1', branch_id: branchId, status: 'OPEN' },
          error: null,
        }),
      };
      const userResolveQuery = createMockUserQuery(null, null);

      mockSupabase.from
        .mockReturnValueOnce(shiftFetchQuery)
        .mockReturnValueOnce(userResolveQuery);

      await expect(
        service.closeShift('token', staffUser, 'shift-1', {
          ending_cash: 500000,
        }),
      ).rejects.toMatchObject({
        code: 'ERR_1001_UNAUTHORIZED',
        message: 'Không tìm thấy thông tin tài khoản người dùng',
      });
    });

    it('should reject closeShift if shift is already closed', async () => {
      const shiftFetchQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 'shift-1', branch_id: branchId, status: 'CLOSED' },
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(shiftFetchQuery);

      await expect(
        service.closeShift('token', staffUser, 'shift-1', {
          ending_cash: 500000,
        }),
      ).rejects.toThrow(AppException);
    });

    it('should reject closeShift if STAFF attempts to close shift of another branch', async () => {
      const shiftFetchQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 'shift-diff-branch', branch_id: otherBranchId, status: 'OPEN' },
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(shiftFetchQuery);

      await expect(
        service.closeShift('token', staffUser, 'shift-diff-branch', {
          ending_cash: 500000,
        }),
      ).rejects.toMatchObject({
        code: 'ERR_9001_VALIDATION_FAILED',
        message: 'Nhân viên không có quyền đóng ca của chi nhánh khác',
      });
    });
  });

  describe('ShiftController & ShiftService: getCurrentShift Regression Tests', () => {
    it('1. current shift with JWT branch_id works without query string (Controller)', async () => {
      const query = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 'shift-from-jwt', branch_id: branchId, status: 'OPEN' },
          error: null,
        }),
      };
      mockSupabase.from.mockReturnValue(query);

      // Call GET /api/v1/shifts/current without query string
      const result = await controller.getCurrentShift(staffUser, 'token', undefined);

      expect(result).toBeDefined();
      expect(result?.id).toBe('shift-from-jwt');
      expect(query.eq).toHaveBeenCalledWith('branch_id', branchId);
      expect(query.eq).toHaveBeenCalledWith('status', 'OPEN');
    });

    it('1b. current shift with JWT branch_id works without query string (Service directly)', async () => {
      const query = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 'shift-jwt-service', branch_id: branchId, status: 'OPEN' },
          error: null,
        }),
      };
      mockSupabase.from.mockReturnValue(query);

      const result = await service.getCurrentShift('token', staffUser);

      expect(result?.id).toBe('shift-jwt-service');
      expect(query.eq).toHaveBeenCalledWith('branch_id', branchId);
    });

    it('2. no branch_id in authenticated user returns controlled validation error (Controller)', async () => {
      await expect(
        controller.getCurrentShift(staffUserWithoutBranch, 'token', undefined),
      ).rejects.toMatchObject({
        code: 'ERR_9001_VALIDATION_FAILED',
        message: 'Tài khoản chưa được gán chi nhánh',
      });
    });

    it('2b. no branch_id in authenticated user returns controlled validation error (Service)', async () => {
      await expect(
        service.getCurrentShift('token', staffUserWithoutBranch),
      ).rejects.toMatchObject({
        code: 'ERR_9001_VALIDATION_FAILED',
        message: 'Tài khoản chưa được gán chi nhánh',
      });

      await expect(
        service.getCurrentShift('token', ownerUserWithoutBranch),
      ).rejects.toMatchObject({
        code: 'ERR_9001_VALIDATION_FAILED',
        message: 'Tài khoản chưa được gán chi nhánh',
      });
    });

    it('3. STAFF cannot query another branch (Controller & Service)', async () => {
      // Controller level check
      await expect(
        controller.getCurrentShift(staffUser, 'token', otherBranchId),
      ).rejects.toMatchObject({
        code: 'ERR_9001_VALIDATION_FAILED',
        message: 'Nhân viên không có quyền truy cập chi nhánh khác',
      });

      // Service level check
      await expect(
        service.getCurrentShift('token', staffUser, otherBranchId),
      ).rejects.toMatchObject({
        code: 'ERR_9001_VALIDATION_FAILED',
        message: 'Nhân viên không có quyền truy cập chi nhánh khác',
      });
    });

    it('3b. OWNER can query another branch (Controller & Service)', async () => {
      const query = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 'shift-other-branch', branch_id: otherBranchId, status: 'OPEN' },
          error: null,
        }),
      };
      mockSupabase.from.mockReturnValue(query);

      const result = await controller.getCurrentShift(ownerUser, 'token', otherBranchId);

      expect(result?.id).toBe('shift-other-branch');
      expect(query.eq).toHaveBeenCalledWith('branch_id', otherBranchId);
    });

    it('4. no Supabase query receives undefined branch_id', async () => {
      const eqSpy = vi.fn().mockReturnThis();
      const query = {
        select: vi.fn().mockReturnThis(),
        eq: eqSpy,
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };
      mockSupabase.from.mockReturnValue(query);

      // Passing undefined as branchId to service directly must throw before querying DB
      await expect(
        service.getCurrentShift('token', undefined as any),
      ).rejects.toThrow(AppException);

      // Verify eq was never called with undefined
      for (const call of eqSpy.mock.calls) {
        expect(call[0]).not.toBeUndefined();
        expect(call[1]).not.toBeUndefined();
      }

      // Also for empty string
      await expect(
        service.getCurrentShift('token', ''),
      ).rejects.toThrow(AppException);

      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('should return null when no open shift exists for the branch', async () => {
      const query = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };
      mockSupabase.from.mockReturnValue(query);

      const result = await service.getCurrentShift('token', branchId);
      expect(result).toBeNull();
      expect(query.eq).toHaveBeenCalledWith('branch_id', branchId);
      expect(query.eq).toHaveBeenCalledWith('status', 'OPEN');
    });
  });

  describe('ShiftService.listShifts Scoping', () => {
    it('should scope STAFF to user.branch_id even when query has no branch_id', async () => {
      const query: any = Promise.resolve({
        data: [{ id: 'shift-staff-branch' }],
        error: null,
      });
      query.select = vi.fn().mockReturnValue(query);
      query.order = vi.fn().mockReturnValue(query);
      query.eq = vi.fn().mockReturnValue(query);
      mockSupabase.from.mockReturnValue(query);

      const result = await service.listShifts('token', staffUser, {});

      expect(result).toHaveLength(1);
      expect(query.eq).toHaveBeenCalledWith('branch_id', branchId);
    });

    it('should reject STAFF attempting to query another branch', async () => {
      await expect(
        service.listShifts('token', staffUser, { branch_id: otherBranchId }),
      ).rejects.toMatchObject({
        code: 'ERR_9001_VALIDATION_FAILED',
        message: 'Nhân viên không có quyền truy cập chi nhánh khác',
      });
    });

    it('should reject STAFF without branch_id', async () => {
      await expect(
        service.listShifts('token', staffUserWithoutBranch, {}),
      ).rejects.toMatchObject({
        code: 'ERR_9001_VALIDATION_FAILED',
        message: 'Tài khoản chưa được gán chi nhánh',
      });
    });

    it('should allow OWNER to list shifts with or without branch filter', async () => {
      const query: any = Promise.resolve({
        data: [{ id: 'shift-1' }, { id: 'shift-2' }],
        error: null,
      });
      query.select = vi.fn().mockReturnValue(query);
      query.order = vi.fn().mockReturnValue(query);
      query.eq = vi.fn().mockReturnValue(query);
      mockSupabase.from.mockReturnValue(query);

      // OWNER without branch filter
      const resultAll = await service.listShifts('token', ownerUser, {});
      expect(resultAll).toHaveLength(2);
      expect(query.eq).not.toHaveBeenCalledWith('branch_id', expect.anything());

      // OWNER with branch filter
      const resultBranch = await service.listShifts('token', ownerUser, { branch_id: otherBranchId });
      expect(resultBranch).toHaveLength(2);
      expect(query.eq).toHaveBeenCalledWith('branch_id', otherBranchId);
    });
  });
});
