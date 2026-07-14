import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreditTxnType, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { QuotaConfig } from '../config/configuration';

const SAFE_USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  credits: true,
  storageUsed: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  private readonly quota: QuotaConfig;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.quota = config.getOrThrow<QuotaConfig>('quota');
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: SAFE_USER_SELECT,
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return {
      ...user,
      storageUsed: user.storageUsed.toString(),
      storageLimit: this.quota.maxStorageBytesPerUser.toString(),
    };
  }

  async updateProfile(userId: string, name?: string) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { name },
      select: SAFE_USER_SELECT,
    });
    return { ...user, storageUsed: user.storageUsed.toString() };
  }

  /**
   * Atomically debit credits when a user starts a generation job.
   * Throws if the user lacks sufficient balance.
   */
  async debitCredits(userId: string, amount: number, jobId?: string) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { credits: true },
      });
      if (!user) throw new NotFoundException('User not found');
      if (user.credits < amount) {
        throw new BadRequestException('Insufficient credits');
      }

      const updated = await tx.user.update({
        where: { id: userId },
        data: { credits: { decrement: amount } },
        select: { credits: true },
      });

      await tx.creditTransaction.create({
        data: {
          userId,
          type: CreditTxnType.DEBIT,
          amount: -amount,
          balance: updated.credits,
          reason: 'Generation job',
          jobId,
        },
      });

      return updated.credits;
    });
  }

  /**
   * Refund credits (e.g. when a job fails).
   */
  async refundCredits(userId: string, amount: number, jobId?: string) {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: userId },
        data: { credits: { increment: amount } },
        select: { credits: true },
      });
      await tx.creditTransaction.create({
        data: {
          userId,
          type: CreditTxnType.REFUND,
          amount,
          balance: updated.credits,
          reason: 'Job failed — credit refund',
          jobId,
        },
      });
      return updated.credits;
    });
  }

  async grantCredits(userId: string, amount: number, reason?: string) {
    const target = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!target) throw new NotFoundException('User not found');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: userId },
        data: { credits: { increment: amount } },
        select: SAFE_USER_SELECT,
      });
      await tx.creditTransaction.create({
        data: {
          userId,
          type: CreditTxnType.GRANT,
          amount,
          balance: updated.credits,
          reason: reason ?? 'Admin grant',
        },
      });
      return { ...updated, storageUsed: updated.storageUsed.toString() };
    });
  }

  async addStorageUsage(userId: string, bytes: number) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { storageUsed: { increment: BigInt(Math.max(0, bytes)) } },
    });
  }

  async assertStorageAvailable(userId: string, incomingBytes: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { storageUsed: true },
    });
    if (!user) throw new NotFoundException('User not found');
    const limit = BigInt(this.quota.maxStorageBytesPerUser);
    if (user.storageUsed + BigInt(incomingBytes) > limit) {
      throw new BadRequestException('Storage quota exceeded');
    }
  }

  // ── Admin operations ──────────────────────────

  async listUsers(skip = 0, take = 20) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        skip,
        take: Math.min(take, 100),
        orderBy: { createdAt: 'desc' },
        select: SAFE_USER_SELECT,
      }),
      this.prisma.user.count(),
    ]);
    return {
      items: items.map((u) => ({
        ...u,
        storageUsed: u.storageUsed.toString(),
      })),
      total,
      skip,
      take,
    };
  }

  async setActive(userId: string, isActive: boolean) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { isActive },
      select: SAFE_USER_SELECT,
    });
    return { ...user, storageUsed: user.storageUsed.toString() };
  }

  async setRole(userId: string, role: Role) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { role },
      select: SAFE_USER_SELECT,
    });
    return { ...user, storageUsed: user.storageUsed.toString() };
  }
}
