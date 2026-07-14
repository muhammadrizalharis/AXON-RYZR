import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { ComfyuiService } from '../comfyui/comfyui.service';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly comfyui: ComfyuiService,
  ) {}

  @Public()
  @Get()
  async check() {
    const [db, comfy] = await Promise.all([
      this.checkDb(),
      this.comfyui.health(),
    ]);

    const healthy = db && comfy;
    return {
      status: healthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        database: db ? 'up' : 'down',
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
}
