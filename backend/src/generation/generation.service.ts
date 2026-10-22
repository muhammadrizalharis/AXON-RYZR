import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JobStatus, JobType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { JobsService } from '../jobs/jobs.service';
import { ComfyuiConfig, QuotaConfig } from '../config/configuration';
import { GenerationParams } from '../jobs/jobs.constants';
import { serializeBigInt } from '../common/utils/serialize';
import { CreateImageDto } from './dto/create-image.dto';
import { CreateVideoDto } from './dto/create-video.dto';
import { CreateAudioDto } from './dto/create-audio.dto';
import {
  applyStyle,
  AspectRatio,
  GenerationStyle,
  ImageResolution,
  resolveDimensions,
} from './generation.presets';

@Injectable()
export class GenerationService {
  private readonly logger = new Logger(GenerationService.name);
  private readonly quota: QuotaConfig;
  private readonly videoEnabled: boolean;
  private readonly audioEnabled: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly jobs: JobsService,
    config: ConfigService,
  ) {
    this.quota = config.getOrThrow<QuotaConfig>('quota');
    const comfy = config.getOrThrow<ComfyuiConfig>('comfyui');
    this.videoEnabled = comfy.videoEnabled;
    this.audioEnabled = comfy.audioEnabled;
  }

  async createImageJob(userId: string, dto: CreateImageDto) {
    const batchSize = dto.batchSize ?? 1;
    const cost = this.quota.imageCreditCost * batchSize;

    const { width, height } = resolveDimensions(
      dto.aspectRatio ?? AspectRatio.SQUARE,
      dto.resolution ?? ImageResolution.FHD,
    );

    const params: GenerationParams = {
      width,
      height,
      steps: dto.steps ?? 25,
      cfg: 7,
      seed: dto.seed ?? this.randomSeed(),
      batchSize,
      aspectRatio: dto.aspectRatio,
      style: dto.style,
      verifyText: dto.verifyText,
    };

    return this.createJob({
      userId,
      type: JobType.IMAGE,
      prompt: applyStyle(dto.prompt, dto.style ?? GenerationStyle.NONE),
      negativePrompt: dto.negativePrompt,
      params: { ...params, originalPrompt: dto.prompt },
      cost,
      projectId: dto.projectId,
    });
  }

  async createVideoJob(userId: string, dto: CreateVideoDto) {
    if (!this.videoEnabled) {
      throw new NotImplementedException(
        'Text-to-video belum tersedia: model & node video belum terpasang di ' +
          'ComfyUI. Aktifkan lewat COMFYUI_VIDEO_ENABLED=true setelah tersedia.',
      );
    }
    const cost = this.quota.videoCreditCost;
    const fps = dto.fps ?? 24;
    const duration = dto.duration ?? 5;

    const { width, height } = resolveDimensions(
      dto.aspectRatio ?? AspectRatio.LANDSCAPE_16_9,
      dto.resolution ?? ImageResolution.HD,
      1280, // Wan 2.2 5B native long edge (1280x704)
    );

    const params: GenerationParams = {
      width,
      height,
      steps: dto.steps ?? 25,
      cfg: 5, // Wan 2.2 reference guidance
      seed: dto.seed ?? this.randomSeed(),
      fps,
      duration,
      frames: Math.max(1, Math.round(duration * fps)),
      aspectRatio: dto.aspectRatio,
      style: dto.style,
      verifyText: dto.verifyText,
    };

    return this.createJob({
      userId,
      type: JobType.VIDEO,
      prompt: applyStyle(dto.prompt, dto.style ?? GenerationStyle.NONE),
      negativePrompt: dto.negativePrompt,
      params: { ...params, originalPrompt: dto.prompt },
      cost,
      projectId: dto.projectId,
    });
  }

  async createAudioJob(userId: string, dto: CreateAudioDto) {
    if (!this.audioEnabled) {
      throw new NotImplementedException(
        'Text-to-music belum tersedia: model ACE-Step belum terpasang di ' +
          'ComfyUI. Aktifkan lewat COMFYUI_AUDIO_ENABLED=true setelah tersedia.',
      );
    }
    const cost = this.quota.audioCreditCost;

    const params: GenerationParams = {
      width: 0,
      height: 0,
      steps: dto.steps ?? 50,
      cfg: 5, // ACE-Step reference guidance
      seed: dto.seed ?? this.randomSeed(),
      seconds: dto.duration ?? 60,
      lyrics: dto.lyrics,
      lyricsStrength: dto.lyricsStrength,
    };

    return this.createJob({
      userId,
      type: JobType.AUDIO,
      prompt: dto.prompt,
      params,
      cost,
      projectId: dto.projectId,
    });
  }

  /**
   * Re-queues a FAILED/CANCELLED job with its original parameters and a fresh
   * seed. Credits are debited again (the original failure was refunded).
   */
  async retryJob(userId: string, jobId: string) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job || job.userId !== userId) {
      throw new NotFoundException('Job not found');
    }
    if (job.status !== JobStatus.FAILED && job.status !== JobStatus.CANCELLED) {
      throw new BadRequestException(
        'Only failed or cancelled jobs can be retried',
      );
    }
    if (job.type === JobType.VIDEO && !this.videoEnabled) {
      throw new NotImplementedException(
        'Text-to-video belum tersedia — job video tidak dapat diulang.',
      );
    }
    if (job.type === JobType.AUDIO && !this.audioEnabled) {
      throw new NotImplementedException(
        'Text-to-music belum tersedia — job audio tidak dapat diulang.',
      );
    }

    const params = {
      ...(job.params as unknown as GenerationParams),
      seed: this.randomSeed(), // fresh seed so transient artifacts differ
    };

    return this.createJob({
      userId,
      type: job.type,
      // Stored prompt already includes the style suffix — reuse verbatim.
      prompt: job.prompt,
      negativePrompt: job.negativePrompt ?? undefined,
      params,
      cost: job.creditsCost,
      projectId: job.projectId ?? undefined,
    });
  }

  private async createJob(input: {
    userId: string;
    type: JobType;
    prompt: string;
    negativePrompt?: string;
    params: GenerationParams;
    cost: number;
    projectId?: string;
  }) {
    // Ensure the target project (if any) belongs to the requesting user.
    if (input.projectId) {
      const project = await this.prisma.project.findUnique({
        where: { id: input.projectId },
        select: { userId: true },
      });
      if (!project || project.userId !== input.userId) {
        throw new NotFoundException('Project not found');
      }
    }

    // Debit credits atomically first — throws 400 if insufficient.
    await this.users.debitCredits(input.userId, input.cost);

    let job;
    try {
      job = await this.prisma.job.create({
        data: {
          userId: input.userId,
          projectId: input.projectId,
          type: input.type,
          status: JobStatus.QUEUED,
          prompt: input.prompt,
          negativePrompt: input.negativePrompt,
          params: input.params as unknown as Prisma.InputJsonObject,
          creditsCost: input.cost,
        },
      });
    } catch (err) {
      // Roll back the debit if we couldn't persist the job.
      await this.users.refundCredits(input.userId, input.cost);
      throw err;
    }

    try {
      await this.jobs.enqueue({
        jobId: job.id,
        userId: input.userId,
        type: input.type,
        prompt: input.prompt,
        negativePrompt: input.negativePrompt,
        params: input.params,
        creditsCost: input.cost,
      });
    } catch (err) {
      await this.prisma.job.update({
        where: { id: job.id },
        data: { status: JobStatus.FAILED, error: 'Failed to enqueue job' },
      });
      await this.users.refundCredits(input.userId, input.cost, job.id);
      throw err;
    }

    this.logger.log(`Queued ${input.type} job ${job.id} (cost ${input.cost})`);
    return serializeBigInt(job);
  }

  private randomSeed(): number {
    // 32-bit positive seed.
    return Math.floor(Math.random() * 2_147_483_647);
  }
}
