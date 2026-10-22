import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { AssetType, JobStatus, JobType } from '@prisma/client';
import { Job as BullJob } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { UsersService } from '../users/users.service';
import {
  ComfyuiService,
  ComfyOutputFile,
  ComfyInterruptedError,
} from '../comfyui/comfyui.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { buildTextToImageWorkflow } from '../comfyui/workflows/text-to-image.workflow';
import { buildTextToVideoWorkflow } from '../comfyui/workflows/text-to-video.workflow';
import { buildTextToAudioWorkflow } from '../comfyui/workflows/text-to-audio.workflow';
import {
  GENERATION_QUEUE,
  GenerationJobData,
  GenerationParams,
} from './jobs.constants';
import { PromptIntelligenceService } from '../prompt-intelligence/prompt-intelligence.service';
import { TextVerificationService } from '../text-verification/text-verification.service';

@Processor(GENERATION_QUEUE, {
  concurrency: Number(process.env.JOB_CONCURRENCY) || 2,
})
export class JobsProcessor extends WorkerHost {
  private readonly logger = new Logger(JobsProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly users: UsersService,
    private readonly comfyui: ComfyuiService,
    private readonly realtime: RealtimeGateway,
    private readonly promptIntel: PromptIntelligenceService,
    private readonly textVerify: TextVerificationService,
  ) {
    super();
  }

  async process(bullJob: BullJob<GenerationJobData>): Promise<void> {
    const { jobId, userId, type, prompt, negativePrompt, params } =
      bullJob.data;

    this.logger.log(`Processing job ${jobId} (${type}) for user ${userId}`);

    try {
      const started = await this.markRendering(jobId, userId, type);
      if (!started) {
        this.logger.log(`Job ${jobId} was cancelled before rendering started`);
        return;
      }

      const renderPrompt = await this.enhancePrompt(type, prompt, params);

      const outputs = await this.renderWithVerification(
        jobId,
        userId,
        type,
        renderPrompt,
        negativePrompt,
        params,
      );

      // The user may have cancelled while the render was finishing.
      if (outputs === null || (await this.isCancelled(jobId))) {
        this.logger.log(`Job ${jobId} cancelled — discarding outputs`);
        return;
      }

      const assets = await this.persistOutputs(userId, jobId, type, outputs);

      await this.markCompleted(jobId, userId, type, assets);
      this.logger.log(`Job ${jobId} completed with ${assets.length} asset(s)`);
    } catch (err) {
      if (
        err instanceof ComfyInterruptedError ||
        (await this.isCancelled(jobId))
      ) {
        this.logger.log(`Job ${jobId} cancelled by user — no retry`);
        return; // do not mark FAILED, do not refund again, do not retry
      }
      await this.handleFailure(bullJob, err as Error);
      throw err; // let BullMQ apply retry/backoff
    }
  }

  private async isCancelled(jobId: string): Promise<boolean> {
    const row = await this.prisma.job.findUnique({
      where: { id: jobId },
      select: { status: true },
    });
    return row?.status === JobStatus.CANCELLED;
  }

  /** Image/video: enrich the user's brief via the local LLM; falls back to the stored prompt. */
  private async enhancePrompt(
    type: JobType,
    storedPrompt: string,
    params: GenerationParams,
  ): Promise<string> {
    if (type === JobType.AUDIO) return storedPrompt;
    const raw = params.originalPrompt ?? storedPrompt;
    const kind = type === JobType.VIDEO ? 'video' : 'image';
    const result = await this.promptIntel.enhance(raw, kind, {
      style: params.style,
      aspectRatio: params.aspectRatio,
    });
    if (result.enhanced) {
      this.logger.log(
        `Prompt enhanced (${kind}): ${raw.length}\u2192${result.text.length} chars`,
      );
      return result.text;
    }
    return storedPrompt;
  }

  /**
   * Renders the job, optionally running the Fase 3 text-accuracy loop: read the
   * text actually rendered (OCR) and, if a required literal is wrong/missing,
   * re-render with a reinforced prompt + fresh seed (up to maxAttempts). Fails
   * SOFT at every step — any issue keeps the best render so far. Returns null
   * only when the user cancelled mid-render.
   */
  private async renderWithVerification(
    jobId: string,
    userId: string,
    type: JobType,
    renderPrompt: string,
    negativePrompt: string | undefined,
    params: GenerationParams,
  ): Promise<ComfyOutputFile[] | null> {
    const verifyOn =
      (type === JobType.IMAGE || type === JobType.VIDEO) &&
      (params.verifyText ?? this.textVerify.defaultEnabled) &&
      this.textVerify.available;

    if (!verifyOn) {
      return this.runRender(
        jobId,
        userId,
        type,
        this.buildWorkflow(type, renderPrompt, negativePrompt, params),
      );
    }

    const required = await this.textVerify.extractRequiredText(
      params.originalPrompt ?? '',
      renderPrompt,
    );
    const extra = required.length ? this.textVerify.maxAttempts : 0;
    let best: { outputs: ComfyOutputFile[]; missing: number } | null = null;

    for (let attempt = 0; attempt <= extra; attempt++) {
      const seed = (params.seed ?? 0) + attempt * 101;
      const prompt =
        attempt > 0
          ? this.textVerify.reinforce(renderPrompt, required)
          : renderPrompt;
      const outputs = await this.runRender(
        jobId,
        userId,
        type,
        this.buildWorkflow(type, prompt, negativePrompt, { ...params, seed }),
      );

      if (await this.isCancelled(jobId)) return null;
      if (!required.length) return outputs; // nothing to verify

      const sample = await this.sampleForOcr(type, outputs);
      const ocr = sample ? await this.textVerify.readImageText(sample) : null;
      if (ocr === null) {
        this.logger.warn(
          `Job ${jobId}: text verification unavailable — keeping render`,
        );
        return outputs;
      }

      const { missing, ok } = this.textVerify.scoreText(required, ocr);
      this.logger.log(
        `Job ${jobId} text verify attempt ${attempt}: ` +
          `${required.length - missing.length}/${required.length} literal(s) OK`,
      );
      if (ok) return outputs;
      if (!best || missing.length < best.missing) {
        best = { outputs, missing: missing.length };
      }
    }

    return best?.outputs ?? null;
  }

  /** Runs one ComfyUI render, wiring progress throttling + cancel tracking. */
  private async runRender(
    jobId: string,
    userId: string,
    type: JobType,
    workflow: Record<string, unknown>,
  ): Promise<ComfyOutputFile[]> {
    let lastEmitted = -1;
    return this.comfyui.runWorkflow(
      workflow,
      async (p) => {
        // Throttle DB writes/socket emits to meaningful progress steps.
        if (p - lastEmitted >= 5 || p === 100) {
          lastEmitted = p;
          await this.updateProgress(jobId, userId, type, p);
        }
      },
      async (promptId) => {
        // Track the ComfyUI prompt so a user cancel can interrupt the GPU.
        await this.prisma.job.update({
          where: { id: jobId },
          data: { comfyPromptId: promptId },
        });
      },
    );
  }

  /** Picks the buffer to OCR: the image itself, or a frame extracted from video. */
  private async sampleForOcr(
    type: JobType,
    outputs: ComfyOutputFile[],
  ): Promise<Buffer | null> {
    if (type === JobType.IMAGE) {
      return (
        outputs.find((o) => o.mimeType.startsWith('image/'))?.buffer ?? null
      );
    }
    if (type === JobType.VIDEO) {
      const vid = outputs.find((o) => o.mimeType.startsWith('video/'));
      if (!vid) return null;
      return this.textVerify.extractVideoFrame(vid.buffer, vid.filename);
    }
    return null;
  }

  private buildWorkflow(
    type: JobType,
    prompt: string,
    negativePrompt: string | undefined,
    params: GenerationParams,
  ): Record<string, unknown> {
    if (type === JobType.VIDEO) {
      const fps = params.fps ?? 24;
      const frames =
        params.frames ?? Math.max(1, Math.round((params.duration ?? 5) * fps));
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
      });
    }

    if (type === JobType.AUDIO) {
      return buildTextToAudioWorkflow({
        tags: prompt,
        lyrics: params.lyrics,
        seconds: params.seconds ?? 60,
        steps: params.steps,
        cfg: params.cfg,
        seed: params.seed,
        lyricsStrength: params.lyricsStrength,
        samplerName: params.samplerName,
        scheduler: params.scheduler,
      });
    }

    return buildTextToImageWorkflow({
      prompt,
      width: params.width,
      height: params.height,
      steps: params.steps,
      seed: params.seed,
      batchSize: params.batchSize,
      guidance: params.guidance,
      samplerName: params.samplerName,
    });
  }

  private async persistOutputs(
    userId: string,
    jobId: string,
    type: JobType,
    outputs: ComfyOutputFile[],
  ) {
    const assetType =
      type === JobType.VIDEO
        ? AssetType.VIDEO
        : type === JobType.AUDIO
          ? AssetType.AUDIO
          : AssetType.IMAGE;
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

  /**
   * Flips the job to RENDERING. Returns false when the job is no longer in a
   * runnable state (e.g. the user cancelled it while it sat in the queue).
   */
  private async markRendering(
    jobId: string,
    userId: string,
    type: JobType,
  ): Promise<boolean> {
    const res = await this.prisma.job.updateMany({
      where: {
        id: jobId,
        status: { in: [JobStatus.QUEUED, JobStatus.RENDERING] },
      },
      data: {
        status: JobStatus.RENDERING,
        startedAt: new Date(),
        progress: 0,
      },
    });
    if (res.count === 0) return false;
    this.realtime.emitJobUpdate(userId, {
      jobId,
      status: JobStatus.RENDERING,
      progress: 0,
      type,
    });
    return true;
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
    const res = await this.prisma.job.updateMany({
      where: { id: jobId, status: { not: JobStatus.CANCELLED } },
      data: {
        status: JobStatus.COMPLETED,
        progress: 100,
        finishedAt: new Date(),
        error: null,
      },
    });
    if (res.count === 0) return;
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
    const maxAttempts = bullJob.opts.attempts ?? 1;
    // BullMQ increments attemptsMade only after this handler returns, so the
    // current attempt is attemptsMade + 1. Detect the last attempt correctly.
    const isFinalAttempt = bullJob.attemptsMade + 1 >= maxAttempts;

    this.logger.error(
      `Job ${jobId} failed (attempt ${bullJob.attemptsMade}): ${err.message}`,
    );

    if (!isFinalAttempt) {
      // Will be retried by BullMQ; surface the wait to the user via QUEUED.
      await this.prisma.job.updateMany({
        where: { id: jobId, status: JobStatus.RENDERING },
        data: { status: JobStatus.QUEUED, progress: 0 },
      });
      this.realtime.emitJobUpdate(userId, {
        jobId,
        status: JobStatus.QUEUED,
        progress: 0,
        type,
      });
      return;
    }

    // Final failure: mark failed and refund credits (skip if user-cancelled).
    const marked = await this.prisma.job.updateMany({
      where: { id: jobId, status: { not: JobStatus.CANCELLED } },
      data: {
        status: JobStatus.FAILED,
        error: err.message.slice(0, 500),
        finishedAt: new Date(),
      },
    });
    if (marked.count === 0) return;

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
