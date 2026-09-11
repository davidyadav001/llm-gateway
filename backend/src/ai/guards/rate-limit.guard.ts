import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuditService } from '../../audit/audit.service';
import { PolicyAction, PolicyRule } from '../../audit/entities/policy-event.entity';
import { RequestStatus } from '../../audit/entities/ai-request.entity';
import Redis from 'ioredis';

interface Window {
  count: number;
  resetAt: number;
}

// In-memory, per-user sliding window - sufficient for a single-instance
// prototype. In a multi-instance production deployment this state must live
// in Redis (see docker-compose.yml, which already provisions a redis
// service for this) so limits are enforced consistently across replicas.
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly windows = new Map<string, Window>();
  private redis: Redis | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  private getRedis(): Redis | undefined {
    if (!this.redis) {
      const url = this.configService.get<string>('redisUrl');
      if (url) this.redis = new Redis(url);
    }
    return this.redis || undefined;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const windowSeconds = this.configService.get<number>('rateLimit.windowSeconds') || 60;
    const maxRequests = this.configService.get<number>('rateLimit.maxRequests') || 20;

    const redis = this.getRedis();
    if (redis) {
      const key = `llm-gateway:rate-limit:${user.userId}`;
      try {
        const count = await redis.incr(key);
        if (count === 1) await redis.expire(key, windowSeconds);
        if (count > maxRequests) {
          await this.logBlocked(user.userId, request.body?.model, request.body?.prompt || '');
          throw new HttpException('Rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
        }
        return true;
      } catch (error) {
        if (error instanceof HttpException) throw error;
        if (this.configService.get<string>('nodeEnv') === 'production') {
          throw new HttpException('Rate limiter unavailable', HttpStatus.SERVICE_UNAVAILABLE);
        }
      }
    }

    const now = Date.now();
    const existing = this.windows.get(user.userId);

    if (!existing || existing.resetAt <= now) {
      this.windows.set(user.userId, { count: 1, resetAt: now + windowSeconds * 1000 });
      return true;
    }

    if (existing.count >= maxRequests) {
      await this.logBlocked(user.userId, request.body?.model, request.body?.prompt || '');
      throw new HttpException('Rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
    }

    existing.count += 1;
    return true;
  }

  private async logBlocked(userId: string, model: string, prompt: string) {
    const aiRequest = await this.auditService.logRequest({
      userId,
      model: model || 'unknown',
      prompt,
      status: RequestStatus.BLOCKED,
    });
    await this.auditService.recordPolicyEvent({
      requestId: aiRequest.id,
      userId,
      rule: PolicyRule.RATE_LIMIT,
      action: PolicyAction.BLOCKED,
    });
  }
}
