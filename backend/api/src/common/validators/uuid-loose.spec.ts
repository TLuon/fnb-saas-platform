import { describe, it, expect } from 'vitest';
import { validate } from 'class-validator';
import { CreateOrderDto } from '../../modules/order/dto/create-order.dto.js';
import { LockTableDto } from '../../modules/reservation/dto/lock-table.dto.js';
import { JoinGroupOrderDto } from '../../modules/group-order/dto/join-group-order.dto.js';
import { MergeCustomersDto } from '../../modules/support/dto/merge-customers.dto.js';

describe('IsUuidLoose Validator & DTO Compatibility Tests (Scenario 11)', () => {
  it('should accept seed data UUIDs with repeating digits across all B2 DTOs', async () => {
    const seedTableId = '22222222-2222-2222-2222-222222222222';
    const seedCustomerId1 = '11111111-1111-1111-1111-111111111111';
    const seedCustomerId2 = '33333333-3333-3333-3333-333333333333';

    // 1. CreateOrderDto
    const createOrder = new CreateOrderDto();
    createOrder.table_id = seedTableId;
    const errorsOrder = await validate(createOrder);
    expect(errorsOrder.length).toBe(0);

    // 2. LockTableDto
    const lockTable = new LockTableDto();
    lockTable.table_id = seedTableId;
    const errorsLock = await validate(lockTable);
    expect(errorsLock.length).toBe(0);

    // 3. JoinGroupOrderDto
    const joinGroup = new JoinGroupOrderDto();
    joinGroup.table_id = seedTableId;
    const errorsJoin = await validate(joinGroup);
    expect(errorsJoin.length).toBe(0);

    // 4. MergeCustomersDto
    const mergeDto = new MergeCustomersDto();
    mergeDto.source_customer_id = seedCustomerId1;
    mergeDto.target_customer_id = seedCustomerId2;
    const errorsMerge = await validate(mergeDto);
    expect(errorsMerge.length).toBe(0);
  });

  it('should accept standard RFC4122 v4 UUIDs', async () => {
    const standardV4 = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

    const createOrder = new CreateOrderDto();
    createOrder.table_id = standardV4;
    const errors = await validate(createOrder);
    expect(errors.length).toBe(0);
  });

  it('should reject malformed or non-hex UUID strings', async () => {
    const invalidInputs = [
      'not-a-uuid',
      '12345',
      '22222222-2222-2222-2222',
      '22222222-2222-2222-2222-22222222222g', // invalid hex
      '22222222222222222222222222222222', // no hyphens
    ];

    for (const input of invalidInputs) {
      const createOrder = new CreateOrderDto();
      createOrder.table_id = input;
      const errors = await validate(createOrder);
      expect(errors.length).toBeGreaterThan(0);
    }
  });
});
