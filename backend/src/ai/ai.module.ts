import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { PolicyService } from './policy/policy.service';
import { LlmProviderService } from './llm-provider/llm-provider.service';
import { ModelAccessGuard } from './guards/model-access.guard';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { ModelAccess } from '../admin/entities/model-access.entity';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([ModelAccess]), AuditModule],
  controllers: [AiController],
  providers: [AiService, PolicyService, LlmProviderService, ModelAccessGuard, RateLimitGuard],
})
export class AiModule {}
