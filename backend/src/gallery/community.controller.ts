import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GalleryService } from './gallery.service';

/** Public (shared) assets feed — visible to any authenticated user. */
@ApiTags('community')
@ApiBearerAuth()
@Controller('community')
export class CommunityController {
  constructor(private readonly galleryService: GalleryService) {}

  @Get()
  feed(@Query('skip') skip = '0', @Query('take') take = '24') {
    return this.galleryService.communityFeed({
      skip: Number(skip),
      take: Number(take),
    });
  }
}
