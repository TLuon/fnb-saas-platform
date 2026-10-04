import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from './auth.service.js';
import { AppException } from '../../common/exceptions/app.exception.js';
import * as crypto from 'crypto';

describe('AuthService & Auth Security Tests', () => {
  let service: AuthService;
  let mockSupabaseAdmin: any;
  let mockSupabaseAnon: any;

  beforeEach(() => {
    mockSupabaseAdmin = {
      from: vi.fn(),
      auth: {
        admin: {
          createUser: vi.fn(),
          deleteUser: vi.fn(),
        },
      },
    };

    mockSupabaseAnon = {
      auth: {
        signInWithPassword: vi.fn(),
        refreshSession: vi.fn(),
      },
    };

    const mockSupabaseService: any = {
      admin: () => mockSupabaseAdmin,
      anon: () => mockSupabaseAnon,
      forUser: vi.fn(),
    };

    service = new AuthService(mockSupabaseService);
  });

  it('should hash 6-digit PIN deterministically with SHA-256', () => {
    const hashStaffPin = (pin: string): string =>
      crypto.createHash('sha256').update(pin).digest('hex');

    const pin = '123456';
    const hash1 = hashStaffPin(pin);
    const hash2 = hashStaffPin(pin);

    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64);
    expect(hashStaffPin('123456')).not.toBe(hashStaffPin('654321'));
  });

  describe('AuthService.login', () => {
    it('should reject login if neither email nor phone is provided', async () => {
      await expect(
        service.login({ email: '', password: 'pwd' } as any)
      ).rejects.toThrow(AppException);

      try {
        await service.login({ email: '', password: 'pwd' } as any);
      } catch (err: any) {
        expect(err.code).toBe('ERR_9001_VALIDATION_FAILED');
      }
    });

    it('should reject login if only phone is provided (MVP limitation: email required)', async () => {
      await expect(
        service.login({ phone: '0901234567', password: 'pwd' } as any)
      ).rejects.toThrow(AppException);

      try {
        await service.login({ phone: '0901234567', password: 'pwd' } as any);
      } catch (err: any) {
        expect(err.code).toBe('ERR_9001_VALIDATION_FAILED');
        expect(err.message).toContain('email');
      }
    });

    it('should reject invalid credentials with ERR_1004_INVALID_CREDENTIALS', async () => {
      mockSupabaseAnon.auth.signInWithPassword.mockResolvedValue({
        data: { session: null },
        error: { message: 'Invalid credentials' },
      });

      await expect(
        service.login({ email: 'wrong@test.com', password: 'bad' })
      ).rejects.toThrow(AppException);

      try {
        await service.login({ email: 'wrong@test.com', password: 'bad' });
      } catch (err: any) {
        expect(err.code).toBe('ERR_1004_INVALID_CREDENTIALS');
      }
    });

    it('should return tokens upon successful authentication', async () => {
      mockSupabaseAnon.auth.signInWithPassword.mockResolvedValue({
        data: {
          session: {
            access_token: 'mock-access-token',
            refresh_token: 'mock-refresh-token',
            expires_in: 3600,
            token_type: 'bearer',
          },
        },
        error: null,
      });

      const result = await service.login({ email: 'user@test.com', password: 'password123' });

      expect(result.access_token).toBe('mock-access-token');
      expect(result.refresh_token).toBe('mock-refresh-token');
      expect(result.expires_in).toBe(3600);
    });
  });

  describe('AuthService.register', () => {
    it('should reject registration if email is missing', async () => {
      await expect(
        service.register({
          email: '',
          password: 'pwd',
          tenant_subdomain: 'demo',
          phone: '0900000000',
        } as any)
      ).rejects.toThrow(AppException);
    });

    it('should reject registration if tenant subdomain does not exist', async () => {
      mockSupabaseAdmin.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      await expect(
        service.register({
          email: 'test@demo.com',
          password: 'pwd',
          tenant_subdomain: 'non-existent',
          phone: '0900000000',
        })
      ).rejects.toThrow(AppException);

      try {
        await service.register({
          email: 'test@demo.com',
          password: 'pwd',
          tenant_subdomain: 'non-existent',
          phone: '0900000000',
        });
      } catch (err: any) {
        expect(err.code).toBe('ERR_9001_VALIDATION_FAILED');
        expect(err.message).toContain('tenant_subdomain không tồn tại');
      }
    });
  });
});
