import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  findAll(): Promise<User[]> {
    return this.usersRepository.find({ order: { createdAt: 'DESC' } });
  }

  create(email: string, passwordHash: string, role: UserRole): Promise<User> {
    const user = this.usersRepository.create({ email, passwordHash, role });
    return this.usersRepository.save(user);
  }

  async updateRole(id: string, role: UserRole): Promise<User | null> {
    await this.usersRepository.update(id, { role });
    return this.findById(id);
  }

  async setActive(id: string, isActive: boolean): Promise<User | null> {
    await this.usersRepository.update(id, { isActive });
    return this.findById(id);
  }
}
