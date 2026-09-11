import { PolicyService } from './policy.service';

function fakeConfigService(blockedCategories: string[]) {
  return { get: () => blockedCategories } as any;
}

describe('PolicyService', () => {
  it('allows a prompt with no matched category', () => {
    const service = new PolicyService(fakeConfigService(['weapons', 'malware']));
    const result = service.check('What is the capital of France?');
    expect(result.allowed).toBe(true);
  });

  it('blocks a prompt containing a configured category keyword', () => {
    const service = new PolicyService(fakeConfigService(['weapons', 'malware']));
    const result = service.check('Tell me about weapons manufacturing stocks');
    expect(result.allowed).toBe(false);
    expect(result.matchedCategory).toBe('weapons');
  });
});
