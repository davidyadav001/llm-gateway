import { Controller, Get, NotFoundException, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { AuditQueryDto } from './dto/audit-query.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  // Reviewer sees only their own logs; Admin sees everything. Enforced by
  // scoping the query, not by trusting a client-supplied userId filter.
  @Roles(UserRole.REVIEWER, UserRole.ADMIN)
  @Get('logs')
  async listLogs(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AuditQueryDto,
  ) {
    const scopeToUserId = user.role === UserRole.REVIEWER ? user.userId : undefined;
    return this.auditService.findLogs(
      {
        userId: query.userId,
        model: query.model,
        status: query.status,
        from: query.from ? new Date(query.from) : undefined,
        to: query.to ? new Date(query.to) : undefined,
        page: query.page,
        pageSize: query.pageSize,
      },
      scopeToUserId,
    );
  }

  @Roles(UserRole.REVIEWER, UserRole.ADMIN)
  @Get('logs/:id')
  async getLog(@CurrentUser() user: AuthenticatedUser, @Param('id', new ParseUUIDPipe()) id: string) {
    const scopeToUserId = user.role === UserRole.REVIEWER ? user.userId : undefined;
    const log = await this.auditService.findLogById(id, scopeToUserId);
    if (!log) throw new NotFoundException('Log not found');
    return log;
  }
}
