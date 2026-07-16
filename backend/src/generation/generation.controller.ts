import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { GenerationService } from './generation.service';
import { CreateImageDto } from './dto/create-image.dto';
import { CreateVideoDto } from './dto/create-video.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('generation')
@ApiBearerAuth()
@Controller('generation')
export class GenerationController {
  constructor(private readonly generationService: GenerationService) {}

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('image')
  createImage(@CurrentUser('id') userId: string, @Body() dto: CreateImageDto) {
    return this.generationService.createImageJob(userId, dto);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('video')
  createVideo(@CurrentUser('id') userId: string, @Body() dto: CreateVideoDto) {
    return this.generationService.createVideoJob(userId, dto);
  }
}
