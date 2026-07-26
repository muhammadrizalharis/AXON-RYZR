import {
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

  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly jobs: JobsService,
    config: ConfigService,
  ) {
    this.quota = config.getOrThrow<QuotaConfig>('quota');
    this.videoEnabled =
      config.getOrThrow<ComfyuiConfig>('comfyui').videoEnabled;
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
    };

    return this.createJob({
      userId,
      type: JobType.IMAGE,
      prompt: applyStyle(dto.prompt, dto.style ?? GenerationStyle.NONE),
      negativePrompt: dto.negativePrompt,
      params,
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
    const fps = dto.fps ?? 8;
    const duration = dto.duration ?? 2;

    const { width, height } = resolveDimensions(
      dto.aspectRatio ?? AspectRatio.LANDSCAPE_16_9,
      dto.resolution ?? ImageResolution.HD,
      1024, // tighter cap for video VRAM budget
    );

    const params: GenerationParams = {
      width,
      height,
      steps: dto.steps ?? 20,
      cfg: 7,
      seed: dto.seed ?? this.randomSeed(),
      fps,
      duration,
      frames: Math.max(1, Math.round(duration * fps)),
      aspectRatio: dto.aspectRatio,
      style: dto.style,
    };

    return this.createJob({
      userId,
      type: JobType.VIDEO,
      prompt: applyStyle(dto.prompt, dto.style ?? GenerationStyle.NONE),
      negativePrompt: dto.negativePrompt,
      params,
      cost,
      projectId: dto.projectId,
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
