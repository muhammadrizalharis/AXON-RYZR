import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AssetType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { UsersService } from '../users/users.service';
import { serializeBigInt } from '../common/utils/serialize';

@Injectable()
export class GalleryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly users: UsersService,
  ) {}

  async list(
    userId: string,
    opts: {
      type?: AssetType;
      projectId?: string;
      skip?: number;
      take?: number;
    } = {},
  ) {
    const skip = opts.skip ?? 0;
    const take = Math.min(opts.take ?? 24, 100);
    const where: Prisma.AssetWhereInput = {
      userId,
      ...(opts.type ? { type: opts.type } : {}),
      ...(opts.projectId ? { projectId: opts.projectId } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.asset.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { job: { select: { prompt: true, type: true } } },
      }),
      this.prisma.asset.count({ where }),
    ]);

    const withUrls = await Promise.all(
      items.map(async (a) => ({
        ...a,
        url: await this.storage.getUrl(a.storageKey),
      })),
    );

    return serializeBigInt({ items: withUrls, total, skip, take });
  }

  async findOne(userId: string, assetId: string) {
    const asset = await this.prisma.asset.findUnique({
      where: { id: assetId },
      include: { job: { select: { prompt: true, type: true, params: true } } },
    });
    if (!asset || asset.userId !== userId) {
      throw new NotFoundException('Asset not found');
    }
    return serializeBigInt({
      ...asset,
      url: await this.storage.getUrl(asset.storageKey),
    });
  }

  async remove(userId: string, assetId: string) {
    const asset = await this.prisma.asset.findUnique({
      where: { id: assetId },
    });
    if (!asset) {
      throw new NotFoundException('Asset not found');
    }
    if (asset.userId !== userId) {
      throw new ForbiddenException('You do not own this asset');
    }

    await this.storage.remove(asset.storageKey).catch(() => undefined);
    await this.prisma.asset.delete({ where: { id: assetId } });

    // Reclaim storage quota.
    await this.users.addStorageUsage(userId, -Number(asset.fileSize));

    return { deleted: true, id: assetId };
  }
}
