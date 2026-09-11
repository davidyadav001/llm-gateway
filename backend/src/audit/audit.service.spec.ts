import { AuditService } from './audit.service';
import { RequestStatus } from './entities/ai-request.entity';

describe('AuditService security behavior', () => {
  it('uses a keyed prompt hash and never stores an excerpt', async () => {
    const aiRequestRepository = {
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => value),
    };
    const policyEventRepository = {};
    const configService = {
      get: jest.fn().mockReturnValue('a'.repeat(32)),
    };
    const service = new AuditService(
      aiRequestRepository as any,
      policyEventRepository as any,
      configService as any,
    );

    const result = await service.logRequest({
      userId: 'user-id',
      model: 'model',
      prompt: 'contains a sensitive prompt',
      status: RequestStatus.ALLOWED,
      includeExcerpt: true,
    });

    expect(result.promptExcerpt).toBeNull();
    expect(result.promptHash).toHaveLength(64);
    expect(result.promptHash).not.toBe(''.padStart(64, '0'));
  });
});
