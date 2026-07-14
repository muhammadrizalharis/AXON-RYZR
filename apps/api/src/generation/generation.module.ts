import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { JobsModule } from '../jobs/jobs.module';
import { GenerationService } from './generation.service';
import { GenerationController } from './generation.controller';

@Module({
  imports: [UsersModule, JobsModule],
  controllers: [GenerationController],
  providers: [GenerationService],
})
export class GenerationModule {}
