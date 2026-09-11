/**
 * Seeds one user per role plus a couple of model_access grants, so RBAC can
 * be exercised end-to-end immediately after `docker-compose up`.
 *
 * Usage: npm run seed  (run from backend/, with DB env vars available)
 */
import 'reflect-metadata';
import 'dotenv/config';
import { DataSource } from 'typeorm';
import * as argon2 from 'argon2';
import { User, UserRole } from '../users/entities/user.entity';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { ModelAccess, AccessPermission } from '../admin/entities/model-access.entity';
import { AiRequest } from '../audit/entities/ai-request.entity';
import { PolicyEvent } from '../audit/entities/policy-event.entity';
import { InitialSchema1710000000000 } from './migrations/1710000000000-InitialSchema';

async function seed() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to run the development seed in production');
  }
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    entities: [User, RefreshToken, ModelAccess, AiRequest, PolicyEvent],
    synchronize: false,
    migrations: [InitialSchema1710000000000],
    migrationsRun: true,
  });

  await dataSource.initialize();
  const userRepo = dataSource.getRepository(User);
  const accessRepo = dataSource.getRepository(ModelAccess);

  const seedUsers: Array<{ email: string; password: string; role: UserRole }> = [
    { email: process.env.SEED_ADMIN_EMAIL || '', password: process.env.SEED_ADMIN_PASSWORD || '', role: UserRole.ADMIN },
    { email: process.env.SEED_REVIEWER_EMAIL || '', password: process.env.SEED_REVIEWER_PASSWORD || '', role: UserRole.REVIEWER },
    { email: process.env.SEED_RESEARCHER_EMAIL || '', password: process.env.SEED_RESEARCHER_PASSWORD || '', role: UserRole.RESEARCHER },
  ];
  if (seedUsers.some((user) => !user.email || !user.password)) {
    throw new Error('Seed credentials must be supplied through SEED_* environment variables');
  }

  const createdUsers: Record<string, User> = {};

  for (const s of seedUsers) {
    let user = await userRepo.findOne({ where: { email: s.email } });
    if (!user) {
      const passwordHash = await argon2.hash(s.password);
      user = await userRepo.save(userRepo.create({ email: s.email, passwordHash, role: s.role }));
      console.log(`Created ${s.role} user: ${s.email}`);
    } else {
      if (process.env.SEED_RESET_PASSWORDS === 'true') {
        user.passwordHash = await argon2.hash(s.password);
        user = await userRepo.save(user);
      }
      console.log(`User already exists: ${s.email}`);
    }
    createdUsers[s.role] = user;
  }

  const grants = [
    { role: UserRole.RESEARCHER, model: 'mock-model-a', permission: AccessPermission.ALLOW },
    { role: UserRole.RESEARCHER, model: 'mock-model-restricted', permission: AccessPermission.DENY },
    { role: UserRole.REVIEWER, model: 'mock-model-a', permission: AccessPermission.ALLOW },
    { role: UserRole.ADMIN, model: 'mock-model-a', permission: AccessPermission.ALLOW },
    { role: UserRole.ADMIN, model: 'mock-model-restricted', permission: AccessPermission.ALLOW },
  ];

  for (const g of grants) {
    const user = createdUsers[g.role];
    const existing = await accessRepo.findOne({ where: { userId: user.id, model: g.model } });
    if (!existing) {
      await accessRepo.save(
        accessRepo.create({
          userId: user.id,
          model: g.model,
          permission: g.permission,
          grantedBy: createdUsers[UserRole.ADMIN].id,
        }),
      );
      console.log(`Granted ${g.permission} on ${g.model} to ${user.email}`);
    }
  }

  await dataSource.destroy();
  console.log('Seed complete.');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
