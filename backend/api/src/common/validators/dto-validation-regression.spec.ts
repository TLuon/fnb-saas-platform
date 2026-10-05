import { describe, it, expect, vi } from 'vitest';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ResolveTicketDto } from '../../modules/support/dto/resolve-ticket.dto.js';
import { MockPaymentDto } from '../../modules/reservation/dto/mock-payment.dto.js';
import { TopupDto } from '../../modules/wallet/dto/topup.dto.js';
import { SubscribeDto } from '../../modules/coffee-pass/dto/subscribe.dto.js';
import { PayOrderDto } from '../../modules/order/dto/pay-order.dto.js';
import { RealtimeGateway } from '../realtime/realtime.gateway.js';

describe('DTO & Security Validation Regression Tests (Phase 3 & 4)', () => {
  describe('ResolveTicketDto (NEW-005)', () => {
    it('should accept valid resolution_note and discount_percent within [1, 100]', async () => {
      const dto = plainToInstance(ResolveTicketDto, {
        resolution_note: 'Resolved with apology discount',
        discount_percent: 20,
        free_item_product_id: '11111111-1111-1111-1111-111111111111',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should reject discount_percent less than 1 or greater than 100000000', async () => {
      const dtoLow = plainToInstance(ResolveTicketDto, { discount_percent: 0 });
      const errorsLow = await validate(dtoLow);
      expect(errorsLow.some((e) => e.property === 'discount_percent')).toBe(true);

      const dtoHigh = plainToInstance(ResolveTicketDto, { discount_percent: 100000001 });
      const errorsHigh = await validate(dtoHigh);
      expect(errorsHigh.some((e) => e.property === 'discount_percent')).toBe(true);
    });

    it('should reject discount_percent if not an integer', async () => {
      const dtoFloat = plainToInstance(ResolveTicketDto, { discount_percent: 15.5 });
      const errorsFloat = await validate(dtoFloat);
      expect(errorsFloat.some((e) => e.property === 'discount_percent')).toBe(true);
    });

    it('should reject free_item_product_id if not a valid loose UUID', async () => {
      const dtoInvalidUuid = plainToInstance(ResolveTicketDto, {
        free_item_product_id: 'not-a-valid-uuid',
      });
      const errors = await validate(dtoInvalidUuid);
      expect(errors.some((e) => e.property === 'free_item_product_id')).toBe(true);
    });
  });

  describe('MockPaymentDto & TopupDto Amount Boundaries', () => {
    it('should reject negative amount in MockPaymentDto', async () => {
      const dto = plainToInstance(MockPaymentDto, {
        raw_transfer_content: 'RES_XYZ123',
        amount: -50000,
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'amount')).toBe(true);
    });

    it('should reject zero amount in MockPaymentDto', async () => {
      const dto = plainToInstance(MockPaymentDto, {
        raw_transfer_content: 'RES_XYZ123',
        amount: 0,
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'amount')).toBe(true);
    });

    it('should reject negative or zero amount in TopupDto', async () => {
      const dtoNeg = plainToInstance(TopupDto, { amount: -100 });
      const errorsNeg = await validate(dtoNeg);
      expect(errorsNeg.some((e) => e.property === 'amount')).toBe(true);

      const dtoZero = plainToInstance(TopupDto, { amount: 0 });
      const errorsZero = await validate(dtoZero);
      expect(errorsZero.some((e) => e.property === 'amount')).toBe(true);
    });
  });

  describe('SubscribeDto & PayOrderDto UUID Validation', () => {
    it('should reject plan_id in SubscribeDto if not a valid UUID', async () => {
      const dto = plainToInstance(SubscribeDto, { plan_id: 'invalid-id' });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'plan_id')).toBe(true);
    });

    it('should accept valid plan_id in SubscribeDto', async () => {
      const dto = plainToInstance(SubscribeDto, {
        plan_id: '11111111-1111-1111-1111-111111111111',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should reject coffee_pass_subscription_id in PayOrderDto if invalid UUID', async () => {
      const dto = plainToInstance(PayOrderDto, {
        payment_method: 'COFFEE_PASS',
        coffee_pass_subscription_id: 'not-a-uuid',
      });
      const errors = await validate(dto);
      expect(errors.some((e) => e.property === 'coffee_pass_subscription_id')).toBe(true);
    });
  });

  describe('Realtime Same-Tenant Group Order Authorization (NEW-004)', () => {
    it('should reject join_group_order if active Redis session does not exist for the table', async () => {
      const mockConfigService: any = {
        get: vi.fn().mockReturnValue('http://localhost:54321'),
      };
      const mockRedisClient = {
        exists: vi.fn().mockResolvedValue(0), // No session in Redis
      };
      const mockRedisService: any = {
        getClient: () => mockRedisClient,
      };

      const gateway = new RealtimeGateway(mockConfigService, mockRedisService);

      const mockSocket: any = {
        id: 'sock-1',
        user: {
          sub: 'cust-1',
          tenant_id: 'tenant-123',
          role_app: 'CUSTOMER',
        },
        emit: vi.fn(),
        join: vi.fn(),
      };

      await gateway.handleJoinGroupOrder(mockSocket, { table_id: 'table-unknown' });

      // Must NOT join room and must emit error
      expect(mockSocket.join).not.toHaveBeenCalled();
      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Active group order session not found for this table',
      });
    });

    it('should allow join_group_order when active Redis session exists for the table', async () => {
      const mockConfigService: any = {
        get: vi.fn().mockReturnValue('http://localhost:54321'),
      };
      const mockRedisClient = {
        exists: vi.fn().mockResolvedValue(1), // Session exists
      };
      const mockRedisService: any = {
        getClient: () => mockRedisClient,
      };

      const gateway = new RealtimeGateway(mockConfigService, mockRedisService);

      const mockSocket: any = {
        id: 'sock-1',
        user: {
          sub: 'cust-1',
          tenant_id: 'tenant-123',
          role_app: 'CUSTOMER',
        },
        emit: vi.fn(),
        join: vi.fn(),
      };

      await gateway.handleJoinGroupOrder(mockSocket, { table_id: 'table-active' });

      expect(mockSocket.join).toHaveBeenCalledWith('group_order:tenant-123:table-active');
      expect(mockSocket.emit).toHaveBeenCalledWith('joined_group_order', {
        room: 'group_order:tenant-123:table-active',
        table_id: 'table-active',
      });
    });
  });
});
