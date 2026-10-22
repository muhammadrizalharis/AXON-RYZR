import { Module } from '@nestjs/common';
import { TextVerificationService } from './text-verification.service';

@Module({
  providers: [TextVerificationService],
  exports: [TextVerificationService],
})
export class TextVerificationModule {}
