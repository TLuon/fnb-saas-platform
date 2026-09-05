import { describe, it, expect, vi } from 'vitest';
import { RealtimeGateway } from './realtime.gateway.js';

describe('RealtimeGateway - CORS & Event Emission Tests', () => {
  it('(Scenario 13) should not allow wildcard origins when in production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    const originalCors = process.env.CORS_ORIGIN;

    process.env.NODE_ENV = 'production';
    process.env.CORS_ORIGIN = 'https://tenant.fnb-saas.com,https://pos.fnb-saas.com';

    const gatewayMetadata = Reflect.getMetadata('websockets:gateway_options', RealtimeGateway);
    expect(gatewayMetadata).toBeDefined();
    expect(gatewayMetadata.cors).toBeDefined();

    const corsOriginFn = gatewayMetadata.cors.origin;
    expect(typeof corsOriginFn).toBe('function');

    // 1. Authorized origin should pass
    let passed = false;
    corsOriginFn('https://tenant.fnb-saas.com', (_err: any, allow: boolean) => {
      passed = allow;
    });
    expect(passed).toBe(true);

    // 2. Unauthorized origin in production should be blocked
    let blocked = false;
    corsOriginFn('https://malicious-site.com', (err: any, allow: boolean) => {
      if (err || !allow) blocked = true;
    });
    expect(blocked).toBe(true);

    // Restore
    process.env.NODE_ENV = originalEnv;
    if (originalCors) process.env.CORS_ORIGIN = originalCors;
    else delete process.env.CORS_ORIGIN;
  });

  it('should emit unmatched_transaction_created to correct support room', () => {
    const mockConfig: any = {
      get: vi.fn(),
    };
    const gateway = new RealtimeGateway(mockConfig);
    const mockServer = {
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
    };
    gateway.server = mockServer as any;

    const tenantId = '11111111-1111-1111-1111-111111111111';
    gateway.emitUnmatchedTransactionCreated(tenantId, {
      transaction_id: 'tx-123',
      amount: 50000,
      raw_transfer_content: 'TEST CONTENT',
    });

    expect(mockServer.to).toHaveBeenCalledWith(`support:${tenantId}`);
    expect(mockServer.emit).toHaveBeenCalledWith('unmatched_transaction_created', {
      transaction_id: 'tx-123',
      amount: 50000,
      raw_transfer_content: 'TEST CONTENT',
    });
  });
});
