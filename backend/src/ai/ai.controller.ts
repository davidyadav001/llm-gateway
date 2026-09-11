import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AiService } from './ai.service';
import { QueryDto } from './dto/query.dto';
import { ModelAccessGuard } from './guards/model-access.guard';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';

// Guard execution order matters and mirrors the sequence diagram in the
// README: JwtAuthGuard (global) -> RolesGuard (global, via @Roles below) ->
// ModelAccessGuard -> RateLimitGuard -> AiService.query() does the policy
// content check -> LLM call -> logging.
@UseGuards(ModelAccessGuard, RateLimitGuard)
@Roles(UserRole.RESEARCHER, UserRole.REVIEWER, UserRole.ADMIN)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('query')
  query(@Body() dto: QueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.aiService.query(user.userId, dto.model, dto.prompt);
  }
}
