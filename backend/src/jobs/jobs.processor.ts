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
import { buildLtxVideoWorkflow } from '../comfyui/workflows/text-to-video-ltx.workflow';
import { buildTextToAudioWorkflow } from '../comfyui/workflows/text-to-audio.workflow';
import {
  GENERATION_QUEUE,
  GenerationJobData,
  GenerationParams,
} from './jobs.constants';
import { PromptIntelligenceService } from '../prompt-intelligence/prompt-intelligence.service';
import { TextVerificationService } from '../text-verification/text-verification.service';
import { MediaService } from '../media/media.service';

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
    private readonly media: MediaService,
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

      const finalOutputs = await this.applyMusicIfRequested(
        jobId,
        type,
        params,
        outputs,
      );

      const assets = await this.persistOutputs(
        userId,
        jobId,
        type,
        finalOutputs,
      );

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
      const refs = await this.resolveReferenceImages(
        jobId,
        userId,
        type,
        renderPrompt,
        negativePrompt,
        params,
      );
      return this.runRender(
        jobId,
        userId,
        type,
        this.buildWorkflow(
          type,
          renderPrompt,
          negativePrompt,
          params,
          refs.startImageName,
          refs.referenceImageName,
        ),
      );
    }

    const refs = await this.resolveReferenceImages(
      jobId,
      userId,
      type,
      renderPrompt,
      negativePrompt,
      params,
    );
    const startImageName = refs.startImageName;
    const referenceImageName = refs.referenceImageName;
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
        this.buildWorkflow(
          type,
          prompt,
          negativePrompt,
          { ...params, seed },
          startImageName,
          referenceImageName,
        ),
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

  /**
   * Image-to-video: downloads the user's uploaded start frame from storage and
   * uploads it into ComfyUI, returning the LoadImage reference. Fails SOFT —
   * on any problem returns undefined so the job falls back to pure text-to-video.
   */
  private async prepareStartImage(
    type: JobType,
    params: GenerationParams,
  ): Promise<string | undefined> {
    if (type !== JobType.VIDEO || !params.sourceImageKey) return undefined;
    try {
      const buffer = await this.storage.getObjectBuffer(params.sourceImageKey);
      const name = await this.comfyui.uploadImage(
        buffer,
        params.sourceImageKey.split('/').pop() || 'i2v-source.png',
      );
      if (!name) {
        this.logger.warn('I2V: ComfyUI image upload returned no name — T2V');
        return undefined;
      }
      this.logger.log(`I2V: animating from uploaded start frame (${name})`);
      return name;
    } catch (err) {
      this.logger.warn(
        `I2V: failed to prepare start image — falling back to T2V: ${
          (err as Error).message
        }`,
      );
      return undefined;
    }
  }

  /**
   * Resolves the two optional reference inputs for a render:
   *  - startImageName: a literal start frame for VIDEO (LTX image-to-video).
   *  - referenceImageName: a character identity reference for IMAGE (FLUX.2
   *    ReferenceLatent).
   *
   * Precedence for VIDEO: an explicit uploaded start frame wins; otherwise a
   * character photo is first turned into an identity-locked scene keyframe
   * (FLUX.2) which then becomes the start frame to animate — "my character as
   * an actor". Everything fails SOFT back to plain text-to-video/image.
   */
  private async resolveReferenceImages(
    jobId: string,
    userId: string,
    type: JobType,
    renderPrompt: string,
    negativePrompt: string | undefined,
    params: GenerationParams,
  ): Promise<{ startImageName?: string; referenceImageName?: string }> {
    if (type === JobType.IMAGE) {
      if (!params.characterImageKey) return {};
      const name = await this.uploadRefToComfy(
        params.characterImageKey,
        'character-ref.png',
      );
      if (name) {
        this.logger.log(`Character lock: FLUX.2 reference image (${name})`);
      }
      return { referenceImageName: name };
    }

    if (type === JobType.VIDEO) {
      // Explicit start frame to animate takes precedence over a character ref.
      const startImageName = await this.prepareStartImage(type, params);
      if (startImageName) return { startImageName };
      if (params.characterImageKey) {
        const keyframe = await this.prepareCharacterKeyframe(
          jobId,
          userId,
          renderPrompt,
          negativePrompt,
          params,
        );
        return { startImageName: keyframe };
      }
    }

    return {};
  }

  /** Uploads a stored image into ComfyUI's input folder. Fails SOFT. */
  private async uploadRefToComfy(
    storageKey: string,
    fallbackName: string,
  ): Promise<string | undefined> {
    try {
      const buffer = await this.storage.getObjectBuffer(storageKey);
      const name = await this.comfyui.uploadImage(
        buffer,
        storageKey.split('/').pop() || fallbackName,
      );
      return name || undefined;
    } catch (err) {
      this.logger.warn(
        `Character lock: failed to upload reference — ${
          (err as Error).message
        }`,
      );
      return undefined;
    }
  }

  /**
   * VIDEO character lock: renders a single FLUX.2 keyframe that places the
   * user's character (identity preserved via ReferenceLatent) into the
   * requested scene, then uploads that keyframe into ComfyUI so LTX-2 can
   * animate it. Fails SOFT — on any problem returns undefined so the job falls
   * back to plain text-to-video.
   */
  private async prepareCharacterKeyframe(
    jobId: string,
    userId: string,
    renderPrompt: string,
    negativePrompt: string | undefined,
    params: GenerationParams,
  ): Promise<string | undefined> {
    const refName = await this.uploadRefToComfy(
      params.characterImageKey as string,
      'character-ref.png',
    );
    if (!refName) return undefined;
    try {
      this.logger.log(`Character lock: rendering FLUX.2 identity keyframe`);
      const keyframeWorkflow = buildTextToImageWorkflow({
        prompt: renderPrompt,
        width: params.width,
        height: params.height,
        steps: 20,
        seed: params.seed,
        batchSize: 1,
        referenceImageName: refName,
      });
      const outputs = await this.runRender(
        jobId,
        userId,
        JobType.IMAGE,
        keyframeWorkflow,
      );
      const image = outputs.find((o) => o.mimeType.startsWith('image/'));
      if (!image) {
        this.logger.warn('Character lock: keyframe produced no image — T2V');
        return undefined;
      }
      const name = await this.comfyui.uploadImage(
        image.buffer,
        `character-keyframe-${params.seed}.png`,
      );
      if (!name) return undefined;
      this.logger.log(`Character lock: animating identity keyframe (${name})`);
      return name;
    } catch (err) {
      this.logger.warn(
        `Character lock: keyframe failed — falling back to T2V: ${
          (err as Error).message
        }`,
      );
      return undefined;
    }
  }

  /**
   * Attaches a music track to a rendered video (image-to-video or text-to-
   * video). Source is either an existing AUDIO job or a freshly generated
   * ACE-Step track. Fails SOFT — on any problem the silent video is kept.
   */
  private async applyMusicIfRequested(
    jobId: string,
    type: JobType,
    params: GenerationParams,
    outputs: ComfyOutputFile[],
  ): Promise<ComfyOutputFile[]> {
    if (type !== JobType.VIDEO) return outputs;
    if (!params.music && !params.musicAudioJobId) return outputs;

    const video = outputs.find((o) => o.mimeType.startsWith('video/'));
    if (!video) return outputs;

    try {
      const track = await this.resolveMusicTrack(jobId, params);
      if (!track) return outputs;

      const muxed = await this.media.muxAudioIntoVideo(
        video.buffer,
        video.filename,
        track.buffer,
        track.filename,
      );
      if (!muxed) {
        this.logger.warn(`Job ${jobId}: mux failed — keeping silent video`);
        return outputs;
      }

      this.logger.log(`Job ${jobId}: music track attached to video`);
      return outputs.map((o) =>
        o === video ? { ...video, buffer: muxed } : o,
      );
    } catch (err) {
      this.logger.warn(
        `Job ${jobId}: music attach failed — keeping silent video: ${
          (err as Error).message
        }`,
      );
      return outputs;
    }
  }

  /** Returns the audio buffer to mux: existing job's track, or auto-generated. */
  private async resolveMusicTrack(
    jobId: string,
    params: GenerationParams,
  ): Promise<{ buffer: Buffer; filename: string } | null> {
    if (params.musicAudioJobId) {
      const asset = await this.prisma.asset.findFirst({
        where: { jobId: params.musicAudioJobId, type: AssetType.AUDIO },
        select: { storageKey: true },
      });
      if (!asset) {
        this.logger.warn(`Job ${jobId}: referenced audio has no asset`);
        return null;
      }
      const buffer = await this.storage.getObjectBuffer(asset.storageKey);
      return {
        buffer,
        filename: asset.storageKey.split('/').pop() || 'music.mp3',
      };
    }

    // Auto-generate a backing track with ACE-Step.
    const workflow = buildTextToAudioWorkflow({
      tags: params.musicPrompt || params.originalPrompt || 'cinematic, ambient',
      seconds: params.musicSeconds ?? 60,
      steps: 50,
      cfg: 5,
      seed: params.seed ?? 0,
    });
    const audioOutputs = await this.comfyui.runWorkflow(workflow);
    const audio = audioOutputs.find((o) => o.mimeType.startsWith('audio/'));
    if (!audio) {
      this.logger.warn(`Job ${jobId}: music generation produced no audio`);
      return null;
    }
    return { buffer: audio.buffer, filename: audio.filename };
  }

  private buildWorkflow(
    type: JobType,
    prompt: string,
    negativePrompt: string | undefined,
    params: GenerationParams,
    startImageName?: string,
    referenceImageName?: string,
  ): Record<string, unknown> {
    if (type === JobType.VIDEO) {
      const fps = params.fps ?? 24;
      const frames =
        params.frames ?? Math.max(1, Math.round((params.duration ?? 5) * fps));

      // Engine select: LTX-2 22B (high quality, default) or Wan 2.2 5B.
      const engine = (process.env.COMFYUI_VIDEO_ENGINE ?? 'ltx').toLowerCase();
      if (engine !== 'wan') {
        const ltxSteps = Number(process.env.COMFYUI_LTX_STEPS) || 25;
        const ltxCfg = Number(process.env.COMFYUI_LTX_CFG) || 3;
        return buildLtxVideoWorkflow({
          prompt,
          negativePrompt,
          width: params.width,
          height: params.height,
          steps: params.steps && params.steps >= 10 ? params.steps : ltxSteps,
          cfg: ltxCfg,
          seed: params.seed,
          frames,
          fps,
          samplerName: params.samplerName,
          startImageName,
        });
      }

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
        startImageName,
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
      referenceImageName,
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
