import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, NotFoundException } from '@nestjs/common';
import { JobStatus, JobType, Prisma } from '@prisma/client';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { UsersService } from '../users/users.service';
import { ComfyuiService } from '../comfyui/comfyui.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { serializeBigInt } from '../common/utils/serialize';
import {
  GENERATION_JOB_NAME,
  GENERATION_QUEUE,
  GenerationJobData,
} from './jobs.constants';

@Injectable()
export class JobsService {
  constructor(
    @InjectQueue(GENERATION_QUEUE)
    private readonly queue: Queue<GenerationJobData>,
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly users: UsersService,
    private readonly comfyui: ComfyuiService,
    private readonly realtime: RealtimeGateway,
  ) {}

  /**
   * Enqueues a persisted Job onto the BullMQ generation queue.
   */
  async enqueue(data: GenerationJobData): Promise<void> {
    const job = await this.queue.add(GENERATION_JOB_NAME, data, {
      jobId: data.jobId,
      // Transient GPU pressure (e.g. a long video render hogging VRAM) can
      // fail a few attempts in a row — back off up to ~3.5 minutes total.
      attempts: 4,
      backoff: { type: 'exponential', delay: 30_000 },
      removeOnComplete: { age: 3600, count: 1000 },
      removeOnFail: { age: 24 * 3600 },
    });

    await this.prisma.job.update({
      where: { id: data.jobId },
      data: { queueJobId: job.id },
    });
  }

  async findOne(userId: string, jobId: string, isAdmin = false) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: { assets: true },
    });
    if (!job || (!isAdmin && job.userId !== userId)) {
      throw new NotFoundException('Job not found');
    }
    return this.withAssetUrls(job);
  }

  async list(
    userId: string,
    opts: { status?: JobStatus; skip?: number; take?: number } = {},
  ) {
    const skip = opts.skip ?? 0;
    const take = Math.min(opts.take ?? 20, 100);
    const where: Prisma.JobWhereInput = {
      userId,
      ...(opts.status ? { status: opts.status } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.job.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { assets: true },
      }),
      this.prisma.job.count({ where }),
    ]);

    return {
      items: await Promise.all(items.map((j) => this.withAssetUrls(j))),
      total,
      skip,
      take,
    };
  }

  /**
   * Admin overview: every user's generations, newest first, with the owner
   * attached. `q` filters by owner name/email or prompt text.
   */
  async listAll(
    opts: { status?: JobStatus; q?: string; skip?: number; take?: number } = {},
  ) {
    const skip = opts.skip ?? 0;
    const take = Math.min(opts.take ?? 24, 100);
    const q = opts.q?.trim();
    const where: Prisma.JobWhereInput = {
      ...(opts.status ? { status: opts.status } : {}),
      ...(q
        ? {
            OR: [
              { prompt: { contains: q, mode: 'insensitive' } },
              { user: { name: { contains: q, mode: 'insensitive' } } },
              { user: { email: { contains: q, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.job.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          assets: true,
          user: { select: { id: true, name: true, email: true, role: true } },
        },
      }),
      this.prisma.job.count({ where }),
    ]);

    return {
      items: await Promise.all(items.map((j) => this.withAssetUrls(j))),
      total,
      skip,
      take,
    };
  }

  /**
   * Cancels a QUEUED or RENDERING job. The status is flipped first (atomic
   * guard against double-refunds), then the BullMQ entry is removed and the
   * ComfyUI prompt is dequeued/interrupted, and finally credits are refunded.
   */
  async cancel(userId: string, jobId: string) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job || job.userId !== userId) {
      throw new NotFoundException('Job not found');
    }
    return this.cancelCore(job);
  }

  /** Admin: cancel any user's job (credits are refunded to the owner). */
  async adminCancel(jobId: string) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException('Job not found');
    }
    return this.cancelCore(job);
  }

  private async cancelCore(job: {
    id: string;
    userId: string;
    status: JobStatus;
    creditsCost: number;
    comfyPromptId: string | null;
    progress: number;
    type: JobType;
  }) {
    const jobId = job.id;
    if (
      job.status !== JobStatus.QUEUED &&
      job.status !== JobStatus.RENDERING
    ) {
      const current = await this.prisma.job.findUnique({
        where: { id: jobId },
      });
      return serializeBigInt(current);
    }

    // Atomic flip — count 0 means someone else already finished/cancelled it.
    const flipped = await this.prisma.job.updateMany({
      where: {
        id: jobId,
        status: { in: [JobStatus.QUEUED, JobStatus.RENDERING] },
      },
      data: { status: JobStatus.CANCELLED, finishedAt: new Date() },
    });
    if (flipped.count === 0) {
      const current = await this.prisma.job.findUnique({
        where: { id: jobId },
      });
      return serializeBigInt(current);
    }

    // Best-effort: drop from BullMQ (throws if already active — ignore).
    try {
      const queued = await this.queue.getJob(jobId);
      await queued?.remove();
    } catch {
      /* job already picked up by the worker — interrupt below */
    }

    // Stop the GPU work if it is queued/running on ComfyUI.
    if (job.comfyPromptId) {
      await this.comfyui.cancelPrompt(job.comfyPromptId);
    }

    // Return the credits — the render never delivered.
    await this.users.refundCredits(job.userId, job.creditsCost, jobId);

    const cancelled = await this.prisma.job.findUnique({
      where: { id: jobId },
    });
    this.realtime.emitJobUpdate(job.userId, {
      jobId,
      status: JobStatus.CANCELLED,
      progress: job.progress,
      type: job.type,
    });
    return serializeBigInt(cancelled);
  }

  private async withAssetUrls(job: {
    assets: Array<{ storageKey: string; [k: string]: unknown }>;
    [k: string]: unknown;
  }) {
    const assets = await Promise.all(
      job.assets.map(async (a) => ({
        ...a,
        url: await this.storage.getUrl(a.storageKey),
      })),
    );
    return serializeBigInt({ ...job, assets });
  }
}
