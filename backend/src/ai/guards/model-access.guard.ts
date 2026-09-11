import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ModelAccess, AccessPermission } from '../../admin/entities/model-access.entity';
import { AuditService } from '../../audit/audit.service';
import { PolicyAction, PolicyRule } from '../../audit/entities/policy-event.entity';
import { RequestStatus } from '../../audit/entities/ai-request.entity';

// Runs AFTER RolesGuard (role-level check) and checks per-user, per-model
// grants. Deny-by-default: no row for (user, model) means blocked, not
// allowed. A blocked attempt is still logged so it shows up in the audit
// trail and monitoring dashboard.
@Injectable()
export class ModelAccessGuard implements CanActivate {
  constructor(
    @InjectRepository(ModelAccess)
    private readonly modelAccessRepository: Repository<ModelAccess>,
    private readonly auditService: AuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const model: string | undefined = request.body?.model;

    if (!model) {
      throw new ForbiddenException('Model is required');
    }

    const access = await this.modelAccessRepository.findOne({
      where: { userId: user.userId, model },
    });

    const permitted = access?.permission === AccessPermission.ALLOW;

    if (!permitted) {
      await this.logBlocked(user.userId, model, request.body?.prompt || '');
      throw new ForbiddenException(`No access to model "${model}"`);
    }

    return true;
  }

  private async logBlocked(userId: string, model: string, prompt: string) {
    const aiRequest = await this.auditService.logRequest({
      userId,
      model,
      prompt,
      status: RequestStatus.BLOCKED,
    });
    await this.auditService.recordPolicyEvent({
      requestId: aiRequest.id,
      userId,
      rule: PolicyRule.NO_PERMISSION,
      action: PolicyAction.BLOCKED,
    });
  }
}
