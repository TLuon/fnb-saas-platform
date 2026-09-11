import { describe, it, expect, vi } from 'vitest';
import { RolesGuard } from './roles.guard.js';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { RoleApp } from '../types/auth.types.js';
import { AppException } from '../exceptions/app.exception.js';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';

/**
 * Role-Based Access Control Path (Scenario 1)
 *
 * NOTE: Live PostgreSQL RLS policies in Supabase are [NOT LIVE VERIFIED]
 * without a connected Supabase/PostgreSQL instance.
 * This test suite verifies the NestJS application-level RolesGuard execution.
 */
describe('RolesGuard & Access Control Path (Scenario 1 - App Level)', () => {
  const reflector = new Reflector();
  const guard = new RolesGuard(reflector);

  const createMockContext = (role: RoleApp): ExecutionContext => {
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({
          user: {
            sub: 'user-1',
            tenant_id: 'tenant-1',
            role_app: role,
          },
        }),
      }),
    } as any;
  };

  it('should allow OWNER access to OWNER, STAFF, CUSTOMER endpoints', () => {
    const context = createMockContext('OWNER');
    vi.spyOn(reflector, 'getAllAndOverride').mockImplementation((key: any) => {
      if (key === IS_PUBLIC_KEY) return false;
      if (key === ROLES_KEY) return ['OWNER', 'STAFF', 'CUSTOMER'];
      return null;
    });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should block CUSTOMER from accessing STAFF endpoints with ERR_1002_FORBIDDEN_ROLE', () => {
    const context = createMockContext('CUSTOMER');
    vi.spyOn(reflector, 'getAllAndOverride').mockImplementation((key: any) => {
      if (key === IS_PUBLIC_KEY) return false;
      if (key === ROLES_KEY) return ['STAFF'];
      return null;
    });
    expect(() => guard.canActivate(context)).toThrow(AppException);

    try {
      guard.canActivate(context);
    } catch (err: any) {
      expect(err.code).toBe('ERR_1002_FORBIDDEN_ROLE');
    }
  });

  it('should block STAFF from accessing OWNER-only endpoints with ERR_1002_FORBIDDEN_ROLE', () => {
    const context = createMockContext('STAFF');
    vi.spyOn(reflector, 'getAllAndOverride').mockImplementation((key: any) => {
      if (key === IS_PUBLIC_KEY) return false;
      if (key === ROLES_KEY) return ['OWNER'];
      return null;
    });
    expect(() => guard.canActivate(context)).toThrow(AppException);

    try {
      guard.canActivate(context);
    } catch (err: any) {
      expect(err.code).toBe('ERR_1002_FORBIDDEN_ROLE');
    }
  });
});
