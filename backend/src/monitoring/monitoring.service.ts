import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiRequest, RequestStatus } from '../audit/entities/ai-request.entity';
import { PolicyEvent } from '../audit/entities/policy-event.entity';

@Injectable()
export class MonitoringService {
  constructor(
    @InjectRepository(AiRequest)
    private readonly aiRequestRepository: Repository<AiRequest>,
    @InjectRepository(PolicyEvent)
    private readonly policyEventRepository: Repository<PolicyEvent>,
  ) {}

  async getStats() {
    const total = await this.aiRequestRepository.count();
    const allowed = await this.aiRequestRepository.count({
      where: { status: RequestStatus.ALLOWED },
    });
    const blocked = await this.aiRequestRepository.count({
      where: { status: RequestStatus.BLOCKED },
    });
    const errored = await this.aiRequestRepository.count({
      where: { status: RequestStatus.ERROR },
    });

    const byModelRaw = await this.aiRequestRepository
      .createQueryBuilder('r')
      .select('r.model', 'model')
      .addSelect('COUNT(*)', 'count')
      .groupBy('r.model')
      .orderBy('count', 'DESC')
      .getRawMany();

    const byModel = byModelRaw.map((row) => ({
      model: row.model,
      count: parseInt(row.count, 10),
    }));

    const recentPolicyEvents = await this.policyEventRepository.find({
      order: { createdAt: 'DESC' },
      take: 20,
    });

    // Simple, transparent "suspicious activity" heuristic for the prototype:
    // users with 3+ blocked policy events in the last hour.
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const suspiciousRaw = await this.policyEventRepository
      .createQueryBuilder('p')
      .select('p.userId', 'userId')
      .addSelect('COUNT(*)', 'count')
      .where('p.createdAt >= :since', { since: oneHourAgo })
      .andWhere("p.action = 'blocked'")
      .groupBy('p.userId')
      .having('COUNT(*) >= 3')
      .getRawMany();

    const suspiciousUsers = suspiciousRaw.map((row) => ({
      userId: row.userId,
      blockedInLastHour: parseInt(row.count, 10),
    }));

    return {
      totals: { total, allowed, blocked, errored },
      byModel,
      recentPolicyEvents,
      suspiciousUsers,
    };
  }
}
