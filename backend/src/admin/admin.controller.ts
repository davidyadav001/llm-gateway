import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { GrantAccessDto } from './dto/grant-access.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CurrentUser, AuthenticatedUser } from '../auth/decorators/current-user.decorator';

// Every route here is Admin-only. Nothing in this controller is reachable
// by Researcher or Reviewer tokens - enforced by RolesGuard, verify with
// admin.controller.spec.ts.
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('model-access')
  grantAccess(@Body() dto: GrantAccessDto, @CurrentUser() admin: AuthenticatedUser) {
    return this.adminService.grantOrUpdateAccess(dto, admin.userId);
  }

  @Get('model-access')
  listAllAccess() {
    return this.adminService.listAllAccess();
  }

  @Get('model-access/:userId')
  listAccessForUser(@Param('userId', new ParseUUIDPipe()) userId: string) {
    return this.adminService.listAccessForUser(userId);
  }

  @Delete('model-access/:id')
  revokeAccess(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.adminService.revokeAccess(id);
  }

  @Get('users')
  listUsers() {
    return this.adminService.listUsers();
  }

  @Patch('users/:id/role')
  updateRole(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateRoleDto) {
    return this.adminService.updateUserRole(id, dto.role);
  }

  @Patch('users/:id/deactivate')
  deactivateUser(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.adminService.deactivateUser(id);
  }
}
