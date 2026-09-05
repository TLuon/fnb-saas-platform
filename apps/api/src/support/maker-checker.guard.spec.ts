import { MakerCheckerGuard } from './maker-checker.guard';
import { ExecutionContext, HttpException } from '@nestjs/common';

describe('MakerCheckerGuard', () => {
  let guard: MakerCheckerGuard;

  beforeEach(() => {
    guard = new MakerCheckerGuard();
  });

  it('should throw ERR_6002_SELF_APPROVAL if makerId === checkerId', () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { 'x-user-id': 'user-1' },
          body: { makerId: 'user-1' }
        })
      })
    } as ExecutionContext;

    expect(() => guard.canActivate(mockContext)).toThrow(HttpException);
    try {
      guard.canActivate(mockContext);
    } catch (e: any) {
      expect(e.response.code).toBe('ERR_6002_SELF_APPROVAL');
    }
  });

  it('should allow if makerId !== checkerId', () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { 'x-user-id': 'user-2' },
          body: { makerId: 'user-1' }
        })
      })
    } as ExecutionContext;

    expect(guard.canActivate(mockContext)).toBe(true);
  });
});
