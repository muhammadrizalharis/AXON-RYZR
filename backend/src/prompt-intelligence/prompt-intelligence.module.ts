import { Module } from '@nestjs/common';
import { PromptIntelligenceService } from './prompt-intelligence.service';

@Module({
  providers: [PromptIntelligenceService],
  exports: [PromptIntelligenceService],
})
export class PromptIntelligenceModule {}
