import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { GalleryService } from './gallery.service';
import { GalleryController } from './gallery.controller';
import { CommunityController } from './community.controller';

@Module({
  imports: [UsersModule],
  controllers: [GalleryController, CommunityController],
  providers: [GalleryService],
})
export class GalleryModule {}
