import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import configuration, {
  RedisConfig,
  ThrottleConfig,
} from './config/configuration';
import { validateEnv } from './config/env.validation';

import { PrismaModule } from './prisma/prisma.module';
import { StorageModule } from './storage/storage.module';
import { ComfyuiModule } from './comfyui/comfyui.module';
import { RealtimeModule } from './realtime/realtime.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { GenerationModule } from './generation/generation.module';
import { JobsModule } from './jobs/jobs.module';
import { GalleryModule } from './gallery/gallery.module';
import { ProjectsModule } from './projects/projects.module';
import { HealthModule } from './health/health.module';

import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [configuration],
      validate: validateEnv,
    }),

    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const t = config.getOrThrow<ThrottleConfig>('throttle');
        return [{ ttl: t.ttl * 1000, limit: t.limit }];
      },
    }),

    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redis = config.getOrThrow<RedisConfig>('redis');
        return {
          connection: {
            host: redis.host,
            port: redis.port,
            password: redis.password,
          },
        };
      },
    }),

    ScheduleModule.forRoot(),

    // Infrastructure (global)
    PrismaModule,
    StorageModule,
    ComfyuiModule,
    RealtimeModule,

    // Feature modules
    AuthModule,
    UsersModule,
    GenerationModule,
    JobsModule,
    GalleryModule,
    ProjectsModule,
    HealthModule,
  ],
  providers: [
    // Global JWT auth (routes opt out via @Public()).
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Global rate limiting.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Consistent error responses.
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
