import { JobType } from '@prisma/client';

export const GENERATION_QUEUE = 'generation';

export const GENERATION_JOB_NAME = 'process-generation';

/**
 * Payload enqueued to BullMQ for each generation request.
 */
export interface GenerationJobData {
  jobId: string; // Prisma Job id
  userId: string;
  type: JobType;
  prompt: string;
  negativePrompt?: string;
  params: GenerationParams;
  creditsCost: number;
}

/**
 * Normalized generation parameters shared by image & video pipelines.
 */
export interface GenerationParams {
  width: number;
  height: number;
  steps: number;
  cfg: number;
  seed: number;
  samplerName?: string;
  scheduler?: string;
  checkpoint?: string;
  // image only
  batchSize?: number;
  guidance?: number;
  // video only
  frames?: number;
  fps?: number;
  duration?: number;
  motionModule?: string;
  // presentation metadata
  aspectRatio?: string;
  style?: string;
}
