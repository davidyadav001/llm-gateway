import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository, LessThan } from 'typeorm';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'crypto';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  // Self-registration always creates a Researcher. Admin-initiated creation
  // (via /admin/users, not implemented as a separate route here since
  // /auth/register + an authenticated Admin caller covers it) may set role.
  async register(dto: RegisterDto, requestedByAdmin: boolean) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }
    const passwordHash = await argon2.hash(dto.password);
    const role = requestedByAdmin && dto.role ? dto.role : UserRole.RESEARCHER;
    const user = await this.usersService.create(email, passwordHash, role);
    return user.toSafeObject();
  }

  async validateCredentials(email: string, password: string) {
    const user = await this.usersService.findByEmail(email.trim().toLowerCase());
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const valid = await argon2.verify(user.passwordHash, password);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return user;
  }

  async login(email: string, password: string) {
    const user = await this.validateCredentials(email, password);
    return this.issueTokens(user.id, user.email, user.role);
  }

  private async issueTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.accessSecret'),
      expiresIn: this.configService.get<string>('jwt.accessTtl'),
      algorithm: 'HS256',
    });

    const rawRefreshToken = randomBytes(48).toString('hex');
    const refreshTtl = this.configService.get<string>('jwt.refreshTtl') || '7d';
    const expiresAt = new Date(Date.now() + this.parseTtlMs(refreshTtl));

    await this.refreshTokenRepository.save(
      this.refreshTokenRepository.create({
        userId,
        tokenHash: this.hashToken(rawRefreshToken),
        expiresAt,
      }),
    );

    return { accessToken, refreshToken: rawRefreshToken };
  }

  async refresh(rawRefreshToken?: string) {
    if (!rawRefreshToken) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    const tokenHash = this.hashToken(rawRefreshToken);
    const stored = await this.refreshTokenRepository.findOne({
      where: { tokenHash },
    });

    if (!stored || stored.revoked || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.usersService.findById(stored.userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User no longer active');
    }

    // Rotate atomically so two concurrent requests cannot both reuse a token.
    const rotation = await this.refreshTokenRepository
      .createQueryBuilder()
      .update(RefreshToken)
      .set({ revoked: true })
      .where('id = :id AND revoked = false', { id: stored.id })
      .execute();
    if (rotation.affected !== 1) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    return this.issueTokens(user.id, user.email, user.role);
  }

  async logout(rawRefreshToken?: string) {
    if (!rawRefreshToken) return { success: true };
    const tokenHash = this.hashToken(rawRefreshToken);
    await this.refreshTokenRepository.update({ tokenHash }, { revoked: true });
    return { success: true };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private parseTtlMs(ttl: string): number {
    const match = /^(\d+)([smhd])$/.exec(ttl);
    if (!match) return 7 * 24 * 60 * 60 * 1000; // default 7d
    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };
    return value * multipliers[unit];
  }
}
