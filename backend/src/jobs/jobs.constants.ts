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
  // video: diffusion engine — 'ltx' (LTX-2 22B) or 'wan' (Wan 2.2 5B)
  videoEngine?: 'ltx' | 'wan';
  // audio only
  seconds?: number;
  lyrics?: string;
  lyricsStrength?: number;
  // video: image-to-video source (MinIO key of the uploaded start frame)
  sourceImageKey?: string;
  // image/video: character reference photo (MinIO key) — FLUX.2 identity lock
  characterImageKey?: string;
  // video: optional music track muxed into the output
  music?: boolean;
  musicPrompt?: string;
  musicSeconds?: number;
  musicAudioJobId?: string;
  // presentation metadata
  aspectRatio?: string;
  style?: string;
  originalPrompt?: string;
  // Fase 3 — opt-in text accuracy (OCR verify + corrective re-render)
  verifyText?: boolean;
}
