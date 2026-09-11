import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiRequest } from '../audit/entities/ai-request.entity';
import { PolicyEvent } from '../audit/entities/policy-event.entity';
import { MonitoringService } from './monitoring.service';
import { MonitoringController } from './monitoring.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AiRequest, PolicyEvent])],
  controllers: [MonitoringController],
  providers: [MonitoringService],
})
export class MonitoringModule {}
