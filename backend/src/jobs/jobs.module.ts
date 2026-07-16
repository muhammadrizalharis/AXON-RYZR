import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { JobsProcessor } from './jobs.processor';
import { GENERATION_QUEUE } from './jobs.constants';

@Module({
  imports: [
    BullModule.registerQueue({ name: GENERATION_QUEUE }),
    UsersModule,
  ],
  controllers: [JobsController],
  providers: [JobsService, JobsProcessor],
  exports: [JobsService],
})
export class JobsModule {}
