import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { UserRole } from '../../users/entities/user.entity';

function mockContext(user: any, handlerMeta: Record<string, any> = {}) {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    __meta: handlerMeta,
  } as any;
}

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('denies access when no @Roles() policy is configured (deny-by-default)', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValueOnce(false).mockReturnValueOnce(undefined);
    const ctx = mockContext({ role: UserRole.ADMIN });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('allows a Public route through regardless of role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValueOnce(true);
    const ctx = mockContext(undefined);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('rejects a Researcher calling an Admin-only route', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValueOnce(false) // isPublic
      .mockReturnValueOnce([UserRole.ADMIN]); // requiredRoles
    const ctx = mockContext({ role: UserRole.RESEARCHER });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('allows an Admin calling an Admin-only route', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValueOnce(false)
      .mockReturnValueOnce([UserRole.ADMIN]);
    const ctx = mockContext({ role: UserRole.ADMIN });
    expect(guard.canActivate(ctx)).toBe(true);
  });
});
