import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ModelAccess } from './entities/model-access.entity';
import { GrantAccessDto } from './dto/grant-access.dto';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/entities/user.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(ModelAccess)
    private readonly modelAccessRepository: Repository<ModelAccess>,
    private readonly usersService: UsersService,
  ) {}

  async grantOrUpdateAccess(dto: GrantAccessDto, grantedBy: string) {
    let record = await this.modelAccessRepository.findOne({
      where: { userId: dto.userId, model: dto.model },
    });
    if (record) {
      record.permission = dto.permission;
      record.grantedBy = grantedBy;
    } else {
      record = this.modelAccessRepository.create({
        userId: dto.userId,
        model: dto.model,
        permission: dto.permission,
        grantedBy,
      });
    }
    return this.modelAccessRepository.save(record);
  }

  listAccessForUser(userId: string) {
    return this.modelAccessRepository.find({ where: { userId } });
  }

  listAllAccess() {
    return this.modelAccessRepository.find({ order: { grantedAt: 'DESC' } });
  }

  async revokeAccess(id: string) {
    const record = await this.modelAccessRepository.findOne({ where: { id } });
    if (!record) throw new NotFoundException('Access record not found');
    await this.modelAccessRepository.remove(record);
    return { success: true };
  }

  listUsers() {
    return this.usersService.findAll().then((users) => users.map((u) => u.toSafeObject()));
  }

  async updateUserRole(id: string, role: UserRole) {
    const user = await this.usersService.updateRole(id, role);
    if (!user) throw new NotFoundException('User not found');
    return user.toSafeObject();
  }

  async deactivateUser(id: string) {
    const user = await this.usersService.setActive(id, false);
    if (!user) throw new NotFoundException('User not found');
    return user.toSafeObject();
  }
}
