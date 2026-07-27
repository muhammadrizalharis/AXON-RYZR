import {
  BadRequestException,
  ForbiddenException,
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
    if (!Number.isInteger(amount) || amount === 0) {
      throw new BadRequestException('Amount must be a non-zero integer');
    }
    const target = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, credits: true },
    });
    if (!target) throw new NotFoundException('User not found');
    if (target.credits + amount < 0) {
      throw new BadRequestException(
        `Balance cannot go below zero (current: ${target.credits})`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: userId },
        data: { credits: { increment: amount } },
        select: SAFE_USER_SELECT,
      });
      await tx.creditTransaction.create({
        data: {
          userId,
          type: amount > 0 ? CreditTxnType.GRANT : CreditTxnType.DEBIT,
          amount,
          balance: updated.credits,
          reason: reason ?? (amount > 0 ? 'Admin grant' : 'Admin deduction'),
        },
      });
      return { ...updated, storageUsed: updated.storageUsed.toString() };
    });
  }

  async addStorageUsage(userId: string, bytes: number) {
    if (bytes === 0) return;
    if (bytes > 0) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { storageUsed: { increment: BigInt(bytes) } },
      });
      return;
    }
    // Reclaiming storage on delete — decrement but never below zero.
    await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { storageUsed: true },
      });
      if (!user) return;
      const next = user.storageUsed + BigInt(bytes);
      await tx.user.update({
        where: { id: userId },
        data: { storageUsed: next > 0n ? next : 0n },
      });
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

  async listUsers(skip = 0, take = 20, q?: string) {
    const where: Prisma.UserWhereInput = q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip,
        take: Math.min(take, 100),
        orderBy: { createdAt: 'desc' },
        select: {
          ...SAFE_USER_SELECT,
          _count: { select: { jobs: true, assets: true } },
        },
      }),
      this.prisma.user.count({ where }),
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

  /** Guard shared by admin mutations: protects self & SUPER_ADMIN targets. */
  private async assertCanManage(
    caller: { id: string; role: Role },
    targetId: string,
    action: 'status' | 'role' | 'credits',
  ) {
    const target = await this.prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true, role: true },
    });
    if (!target) throw new NotFoundException('User not found');

    if (action !== 'credits' && caller.id === targetId) {
      throw new ForbiddenException(
        'You cannot change your own account status or role',
      );
    }
    if (
      target.role === Role.SUPER_ADMIN &&
      caller.role !== Role.SUPER_ADMIN
    ) {
      throw new ForbiddenException('Only a super admin can manage a super admin');
    }
    return target;
  }

  async setActive(
    caller: { id: string; role: Role },
    userId: string,
    isActive: boolean,
  ) {
    await this.assertCanManage(caller, userId, 'status');
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { isActive },
      select: SAFE_USER_SELECT,
    });
    // Disabled users lose every session immediately.
    if (!isActive) {
      await this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    return { ...user, storageUsed: user.storageUsed.toString() };
  }

  async setRole(
    caller: { id: string; role: Role },
    userId: string,
    role: Role,
  ) {
    if (!Object.values(Role).includes(role)) {
      throw new BadRequestException(`Invalid role: ${String(role)}`);
    }
    if (role === Role.SUPER_ADMIN) {
      throw new BadRequestException(
        'SUPER_ADMIN cannot be assigned through the API',
      );
    }
    await this.assertCanManage(caller, userId, 'role');
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { role },
      select: SAFE_USER_SELECT,
    });
    return { ...user, storageUsed: user.storageUsed.toString() };
  }

  // ── Runtime system settings (singleton row id=1) ──

  async getSettings() {
    const row = await this.prisma.systemSetting.findUnique({ where: { id: 1 } });
    return {
      defaultUserCredits: row?.defaultUserCredits ?? this.quota.defaultUserCredits,
    };
  }

  async updateSettings(data: { defaultUserCredits: number }) {
    const row = await this.prisma.systemSetting.upsert({
      where: { id: 1 },
      create: { id: 1, defaultUserCredits: data.defaultUserCredits },
      update: { defaultUserCredits: data.defaultUserCredits },
    });
    return { defaultUserCredits: row.defaultUserCredits };
  }

  /** Effective credits for a brand-new user (DB setting, else env default). */
  async defaultCreditsForNewUser(): Promise<number> {
    const row = await this.prisma.systemSetting.findUnique({ where: { id: 1 } });
    return row?.defaultUserCredits ?? this.quota.defaultUserCredits;
  }
}
