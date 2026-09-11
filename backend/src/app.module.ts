import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { resolve } from 'path';
import configuration from './common/config/configuration';
import { validationSchema } from './common/config/validation.schema';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { AuditModule } from './audit/audit.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { AiModule } from './ai/ai.module';

import { User } from './users/entities/user.entity';
import { RefreshToken } from './auth/entities/refresh-token.entity';
import { ModelAccess } from './admin/entities/model-access.entity';
import { AiRequest } from './audit/entities/ai-request.entity';
import { PolicyEvent } from './audit/entities/policy-event.entity';
import { InitialSchema1710000000000 } from './database/migrations/1710000000000-InitialSchema';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [resolve(process.cwd(), '.env'), resolve(__dirname, '../../../.env')],
      load: [configuration],
      validationSchema,
    }),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 60 }]),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('database.host'),
        port: config.get('database.port'),
        username: config.get('database.username'),
        password: config.get('database.password'),
        database: config.get('database.database'),
        entities: [User, RefreshToken, ModelAccess, AiRequest, PolicyEvent],
        synchronize: false,
        migrations: [InitialSchema1710000000000],
        migrationsRun: true,
      }),
    }),
    UsersModule,
    AuthModule,
    AdminModule,
    AuditModule,
    MonitoringModule,
    AiModule,
  ],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
