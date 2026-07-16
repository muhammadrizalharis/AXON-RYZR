import { Global, Module } from '@nestjs/common';
import { ComfyuiService } from './comfyui.service';

@Global()
@Module({
  providers: [ComfyuiService],
  exports: [ComfyuiService],
})
export class ComfyuiModule {}
