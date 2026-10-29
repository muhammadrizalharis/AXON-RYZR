import { Module } from '@nestjs/common';
import { MediaService } from './media.service';
import { TtsService } from './tts.service';

@Module({
  providers: [MediaService, TtsService],
  exports: [MediaService, TtsService],
})
export class MediaModule {}
