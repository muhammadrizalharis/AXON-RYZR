import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { GalleryService } from './gallery.service';
import { GalleryController } from './gallery.controller';

@Module({
  imports: [UsersModule],
  controllers: [GalleryController],
  providers: [GalleryService],
})
export class GalleryModule {}
