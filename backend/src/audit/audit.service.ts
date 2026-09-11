import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHmac } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { AiRequest, RequestStatus } from './entities/ai-request.entity';
import { PolicyEvent, PolicyAction, PolicyRule } from './entities/policy-event.entity';

export interface LogRequestParams {
  userId: string;
  model: string;
  prompt: string;
  status: RequestStatus;
  tokenUsage?: number | null;
  latencyMs?: number | null;
  // Only include an excerpt when the caller has confirmed the prompt was
  // not flagged by the policy check.
  includeExcerpt?: boolean;
}

export interface RecordPolicyEventParams {
  requestId?: string | null;
  userId: string;
  rule: PolicyRule;
  action: PolicyAction;
}

export interface LogFilters {
  userId?: string;
  model?: string;
  status?: RequestStatus;
  from?: Date;
  to?: Date;
  page: number;
  pageSize: number;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AiRequest)
    private readonly aiRequestRepository: Repository<AiRequest>,
    @InjectRepository(PolicyEvent)
    private readonly policyEventRepository: Repository<PolicyEvent>,
    private readonly configService: ConfigService,
  ) {}

  hashPrompt(prompt: string): string {
    const secret = this.configService.get<string>('auditHashSecret');
    return createHmac('sha256', secret || 'invalid-audit-secret').update(prompt).digest('hex');
  }

  async logRequest(params: LogRequestParams): Promise<AiRequest> {
    const record = this.aiRequestRepository.create({
      userId: params.userId,
      model: params.model,
      promptHash: this.hashPrompt(params.prompt),
      promptExcerpt: null,
      status: params.status,
      tokenUsage: params.tokenUsage ?? null,
      latencyMs: params.latencyMs ?? null,
    });
    return this.aiRequestRepository.save(record);
  }

  async recordPolicyEvent(params: RecordPolicyEventParams): Promise<PolicyEvent> {
    const event = this.policyEventRepository.create({
      requestId: params.requestId ?? null,
      userId: params.userId,
      ruleTriggered: params.rule,
      action: params.action,
    });
    return this.policyEventRepository.save(event);
  }

  async findLogs(filters: LogFilters, scopeToUserId?: string) {
    const qb = this.aiRequestRepository.createQueryBuilder('r').orderBy('r.timestamp', 'DESC');

    // Reviewer scoping: when scopeToUserId is set, ignore any requested
    // userId filter and force it to the caller's own id.
    if (scopeToUserId) {
      qb.andWhere('r.userId = :scopeUserId', { scopeUserId: scopeToUserId });
    } else if (filters.userId) {
      qb.andWhere('r.userId = :userId', { userId: filters.userId });
    }

    if (filters.model) qb.andWhere('r.model = :model', { model: filters.model });
    if (filters.status) qb.andWhere('r.status = :status', { status: filters.status });
    if (filters.from) qb.andWhere('r.timestamp >= :from', { from: filters.from });
    if (filters.to) qb.andWhere('r.timestamp <= :to', { to: filters.to });
    if (filters.from && filters.to && filters.from > filters.to) {
      throw new BadRequestException('Invalid audit date range');
    }

    const page = Math.max(filters.page, 1);
    const pageSize = Math.min(Math.max(filters.pageSize, 1), 100);

    const [items, total] = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      items: items.map(({ promptExcerpt: _promptExcerpt, ...item }) => item),
      total,
      page,
      pageSize,
    };
  }

  async findLogById(id: string, scopeToUserId?: string) {
    const where: any = { id };
    if (scopeToUserId) where.userId = scopeToUserId;
    const log = await this.aiRequestRepository.findOne({ where });
    if (!log) return null;
    const { promptExcerpt: _promptExcerpt, ...safeLog } = log;
    return safeLog;
  }

  async recentPolicyEvents(limit = 20) {
    return this.policyEventRepository.find({
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
