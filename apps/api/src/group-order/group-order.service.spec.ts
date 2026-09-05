import { Test, TestingModule } from '@nestjs/testing';
import { GroupOrderService } from './group-order.service';
import { KitchenGateway } from '../kitchen/kitchen.gateway';

jest.mock('ioredis', () => {
  const mockMulti = {
    set: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(['OK']),
  };
  const MockRedis = jest.fn().mockImplementation(() => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    on: jest.fn(),
    watch: jest.fn().mockResolvedValue('OK'),
    unwatch: jest.fn().mockResolvedValue('OK'),
    multi: jest.fn().mockReturnValue(mockMulti),
  }));
  return {
    __esModule: true,
    default: MockRedis
  };
});

describe('GroupOrderService', () => {
  let service: GroupOrderService;
  let kitchenGatewayMock: Partial<KitchenGateway>;

  beforeEach(async () => {
    kitchenGatewayMock = {
      emitToRoom: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupOrderService,
        { provide: KitchenGateway, useValue: kitchenGatewayMock },
      ],
    }).compile();

    service = module.get<GroupOrderService>(GroupOrderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return empty cart if not found', async () => {
    const cart = await service.getCart('table-test');
    expect(cart.items).toEqual([]);
    expect(cart.version).toBe(1);
  });
});
