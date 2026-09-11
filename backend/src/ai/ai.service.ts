import { BadRequestException, Injectable } from '@nestjs/common';
import { PolicyService } from './policy/policy.service';
import { LlmProviderService } from './llm-provider/llm-provider.service';
import { AuditService } from '../audit/audit.service';
import { RequestStatus } from '../audit/entities/ai-request.entity';
import { PolicyAction, PolicyRule } from '../audit/entities/policy-event.entity';

@Injectable()
export class AiService {
  constructor(
    private readonly policyService: PolicyService,
    private readonly llmProviderService: LlmProviderService,
    private readonly auditService: AuditService,
  ) {}

  // By the time this runs, JwtAuthGuard, RolesGuard, ModelAccessGuard, and
  // RateLimitGuard have all already passed. This method only handles the
  // policy content check + the actual LLM call + success/error logging.
  async query(userId: string, model: string, prompt: string) {
    const policyResult = this.policyService.check(prompt);

    if (!policyResult.allowed) {
      const aiRequest = await this.auditService.logRequest({
        userId,
        model,
        prompt,
        status: RequestStatus.BLOCKED,
      });
      await this.auditService.recordPolicyEvent({
        requestId: aiRequest.id,
        userId,
        rule: PolicyRule.DISALLOWED_CATEGORY,
        action: PolicyAction.BLOCKED,
      });
      // Deliberately vague to the caller - don't reveal which keyword/category
      // matched, so the filter can't be trivially probed and mapped.
      throw new BadRequestException('This request was blocked by content policy');
    }

    const start = Date.now();
    try {
      const result = await this.llmProviderService.complete(model, prompt);
      const latencyMs = Date.now() - start;

      await this.auditService.logRequest({
        userId,
        model,
        prompt,
        status: RequestStatus.ALLOWED,
        tokenUsage: result.tokenUsage,
        latencyMs,
        includeExcerpt: true,
      });

      return { response: result.text, tokenUsage: result.tokenUsage, latencyMs };
    } catch (err) {
      const latencyMs = Date.now() - start;
      await this.auditService.logRequest({
        userId,
        model,
        prompt,
        status: RequestStatus.ERROR,
        latencyMs,
      });
      throw err;
    }
  }
}
