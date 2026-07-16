import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { GENERATION_QUEUE } from '../jobs/jobs.constants';

@Module({
  imports: [BullModule.registerQueue({ name: GENERATION_QUEUE })],
  controllers: [HealthController],
})
export class HealthModule {}
