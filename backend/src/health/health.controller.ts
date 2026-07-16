import { Controller, Get } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { ComfyuiService } from '../comfyui/comfyui.service';
import { StorageService } from '../storage/storage.service';
import { Public } from '../common/decorators/public.decorator';
import { GENERATION_QUEUE } from '../jobs/jobs.constants';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly comfyui: ComfyuiService,
    private readonly storage: StorageService,
    @InjectQueue(GENERATION_QUEUE)
    private readonly queue: Queue,
  ) {}

  @Public()
  @Get()
  async check() {
    const [db, comfy, redis, storage] = await Promise.all([
      this.checkDb(),
      this.comfyui.health(),
      this.checkRedis(),
      this.storage.health(),
    ]);

    // Core services must be up; ComfyUI is external and reported but not fatal.
    const healthy = db && redis && storage;
    return {
      status: healthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        database: db ? 'up' : 'down',
        redis: redis ? 'up' : 'down',
        storage: storage ? 'up' : 'down',
        comfyui: comfy ? 'up' : 'down',
      },
    };
  }

  @Public()
  @Get('live')
  liveness() {
    return { status: 'ok' };
  }

  private async checkDb(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  private async checkRedis(): Promise<boolean> {
    try {
      const client = (await this.queue.client) as unknown as {
        ping(): Promise<string>;
      };
      return (await client.ping()) === 'PONG';
    } catch {
      return false;
    }
  }
}
