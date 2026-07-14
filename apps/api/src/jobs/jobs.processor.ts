import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { AssetType, JobStatus, JobType } from '@prisma/client';
import { Job as BullJob } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { UsersService } from '../users/users.service';
import { ComfyuiService, ComfyOutputFile } from '../comfyui/comfyui.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { buildTextToImageWorkflow } from '../comfyui/workflows/text-to-image.workflow';
import { buildTextToVideoWorkflow } from '../comfyui/workflows/text-to-video.workflow';
import {
  GENERATION_QUEUE,
  GenerationJobData,
  GenerationParams,
} from './jobs.constants';

@Processor(GENERATION_QUEUE, { concurrency: 2 })
export class JobsProcessor extends WorkerHost {
  private readonly logger = new Logger(JobsProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly users: UsersService,
    private readonly comfyui: ComfyuiService,
    private readonly realtime: RealtimeGateway,
  ) {
    super();
  }

  async process(bullJob: BullJob<GenerationJobData>): Promise<void> {
    const { jobId, userId, type, prompt, negativePrompt, params } =
      bullJob.data;

    this.logger.log(`Processing job ${jobId} (${type}) for user ${userId}`);

    try {
      await this.markRendering(jobId, userId, type);

      const workflow = this.buildWorkflow(type, prompt, negativePrompt, params);

      let lastEmitted = -1;
      const outputs = await this.comfyui.runWorkflow(workflow, async (p) => {
        // Throttle DB writes/socket emits to meaningful progress steps.
        if (p - lastEmitted >= 5 || p === 100) {
          lastEmitted = p;
          await this.updateProgress(jobId, userId, type, p);
        }
      });

      const assets = await this.persistOutputs(userId, jobId, type, outputs);

      await this.markCompleted(jobId, userId, type, assets);
      this.logger.log(`Job ${jobId} completed with ${assets.length} asset(s)`);
    } catch (err) {
      await this.handleFailure(bullJob, err as Error);
      throw err; // let BullMQ apply retry/backoff
    }
  }

  private buildWorkflow(
    type: JobType,
    prompt: string,
    negativePrompt: string | undefined,
    params: GenerationParams,
  ): Record<string, unknown> {
    if (type === JobType.VIDEO) {
      const fps = params.fps ?? 8;
      const frames =
        params.frames ??
        Math.max(1, Math.round((params.duration ?? 2) * fps));
      return buildTextToVideoWorkflow({
        prompt,
        negativePrompt,
        width: params.width,
        height: params.height,
        steps: params.steps,
        cfg: params.cfg,
        seed: params.seed,
        frames,
        fps,
        samplerName: params.samplerName,
        scheduler: params.scheduler,
        checkpoint: params.checkpoint,
        motionModule: params.motionModule,
      });
    }

    return buildTextToImageWorkflow({
      prompt,
      negativePrompt,
      width: params.width,
      height: params.height,
      steps: params.steps,
      cfg: params.cfg,
      seed: params.seed,
      samplerName: params.samplerName,
      scheduler: params.scheduler,
      checkpoint: params.checkpoint,
      batchSize: params.batchSize,
    });
  }

  private async persistOutputs(
    userId: string,
    jobId: string,
    type: JobType,
    outputs: ComfyOutputFile[],
  ) {
    const assetType = type === JobType.VIDEO ? AssetType.VIDEO : AssetType.IMAGE;
    const created: Array<{ id: string; url: string; type: string }> = [];

    for (const file of outputs) {
      await this.users.assertStorageAvailable(userId, file.buffer.length);

      const uploaded = await this.storage.uploadBuffer(
        userId,
        file.buffer,
        file.filename,
        file.mimeType,
      );

      const asset = await this.prisma.asset.create({
        data: {
          userId,
          jobId,
          type: assetType,
          storageKey: uploaded.storageKey,
          bucket: uploaded.bucket,
          mimeType: uploaded.mimeType,
          fileSize: BigInt(uploaded.size),
        },
      });

      await this.users.addStorageUsage(userId, uploaded.size);

      created.push({
        id: asset.id,
        url: await this.storage.getUrl(uploaded.storageKey),
        type: assetType,
      });
    }

    return created;
  }

  private async markRendering(jobId: string, userId: string, type: JobType) {
    await this.prisma.job.update({
      where: { id: jobId },
      data: {
        status: JobStatus.RENDERING,
        startedAt: new Date(),
        progress: 0,
      },
    });
    this.realtime.emitJobUpdate(userId, {
      jobId,
      status: JobStatus.RENDERING,
      progress: 0,
      type,
    });
  }

  private async updateProgress(
    jobId: string,
    userId: string,
    type: JobType,
    progress: number,
  ) {
    await this.prisma.job.update({
      where: { id: jobId },
      data: { progress },
    });
    this.realtime.emitJobUpdate(userId, {
      jobId,
      status: JobStatus.RENDERING,
      progress,
      type,
    });
  }

  private async markCompleted(
    jobId: string,
    userId: string,
    type: JobType,
    assets: Array<{ id: string; url: string; type: string }>,
  ) {
    await this.prisma.job.update({
      where: { id: jobId },
      data: {
        status: JobStatus.COMPLETED,
        progress: 100,
        finishedAt: new Date(),
        error: null,
      },
    });
    this.realtime.emitJobUpdate(userId, {
      jobId,
      status: JobStatus.COMPLETED,
      progress: 100,
      type,
      assets,
    });
  }

  private async handleFailure(bullJob: BullJob<GenerationJobData>, err: Error) {
    const { jobId, userId, type, creditsCost } = bullJob.data;
    const isFinalAttempt =
      bullJob.attemptsMade >= (bullJob.opts.attempts ?? 1);

    this.logger.error(
      `Job ${jobId} failed (attempt ${bullJob.attemptsMade}): ${err.message}`,
    );

    if (!isFinalAttempt) {
      // Will be retried by BullMQ; keep status as RENDERING/QUEUED.
      return;
    }

    // Final failure: mark failed and refund credits.
    await this.prisma.job.update({
      where: { id: jobId },
      data: {
        status: JobStatus.FAILED,
        error: err.message.slice(0, 500),
        finishedAt: new Date(),
      },
    });

    try {
      await this.users.refundCredits(userId, creditsCost, jobId);
    } catch (refundErr) {
      this.logger.error(
        `Failed to refund credits for job ${jobId}: ${
          (refundErr as Error).message
        }`,
      );
    }

    this.realtime.emitJobUpdate(userId, {
      jobId,
      status: JobStatus.FAILED,
      progress: 0,
      type,
      error: err.message,
    });
  }
}
