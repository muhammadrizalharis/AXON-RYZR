import {
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AssetType } from '@prisma/client';
import { GalleryService } from './gallery.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('gallery')
@ApiBearerAuth()
@Controller('gallery')
export class GalleryController {
  constructor(private readonly galleryService: GalleryService) {}

  @Get()
  list(
    @CurrentUser('id') userId: string,
    @Query('type') type?: AssetType,
    @Query('projectId') projectId?: string,
    @Query('skip') skip = '0',
    @Query('take') take = '24',
  ) {
    return this.galleryService.list(userId, {
      type,
      projectId,
      skip: Number(skip),
      take: Number(take),
    });
  }

  @Get(':id')
  findOne(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.galleryService.findOne(userId, id);
  }

  @Delete(':id')
  remove(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.galleryService.remove(userId, id);
  }
}
