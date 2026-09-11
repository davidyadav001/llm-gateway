import { ForbiddenException } from '@nestjs/common';
import { ModelAccessGuard } from './model-access.guard';
import { AccessPermission } from '../../admin/entities/model-access.entity';

function mockContext(user: any, body: any) {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user, body }) }),
  } as any;
}

describe('ModelAccessGuard', () => {
  let guard: ModelAccessGuard;
  let repo: any;
  let auditService: any;

  beforeEach(() => {
    repo = { findOne: jest.fn() };
    auditService = {
      logRequest: jest.fn().mockResolvedValue({ id: 'req-1' }),
      recordPolicyEvent: jest.fn().mockResolvedValue({}),
    };
    guard = new ModelAccessGuard(repo, auditService);
  });

  it('blocks and logs when there is no access row for the user/model (deny-by-default)', async () => {
    repo.findOne.mockResolvedValue(null);
    const ctx = mockContext({ userId: 'u1' }, { model: 'mock-model-a', prompt: 'hi' });

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    expect(auditService.logRequest).toHaveBeenCalled();
    expect(auditService.recordPolicyEvent).toHaveBeenCalledWith(
      expect.objectContaining({ rule: 'no_permission' }),
    );
  });

  it('blocks when the row explicitly denies', async () => {
    repo.findOne.mockResolvedValue({ permission: AccessPermission.DENY });
    const ctx = mockContext({ userId: 'u1' }, { model: 'mock-model-restricted', prompt: 'hi' });

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('allows when the row explicitly allows', async () => {
    repo.findOne.mockResolvedValue({ permission: AccessPermission.ALLOW });
    const ctx = mockContext({ userId: 'u1' }, { model: 'mock-model-a', prompt: 'hi' });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(auditService.logRequest).not.toHaveBeenCalled();
  });
});
