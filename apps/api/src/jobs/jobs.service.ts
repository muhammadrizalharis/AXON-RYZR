import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, NotFoundException } from '@nestjs/common';
import { JobStatus, Prisma } from '@prisma/client';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
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
  ) {}

  /**
   * Enqueues a persisted Job onto the BullMQ generation queue.
   */
  async enqueue(data: GenerationJobData): Promise<void> {
    const job = await this.queue.add(GENERATION_JOB_NAME, data, {
      jobId: data.jobId,
      attempts: 2,
      backoff: { type: 'exponential', delay: 5_000 },
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

  async cancel(userId: string, jobId: string) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job || job.userId !== userId) {
      throw new NotFoundException('Job not found');
    }
    if (job.status === JobStatus.QUEUED) {
      const queued = await this.queue.getJob(jobId);
      await queued?.remove();
      return this.prisma.job.update({
        where: { id: jobId },
        data: { status: JobStatus.CANCELLED },
      });
    }
    return job;
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
