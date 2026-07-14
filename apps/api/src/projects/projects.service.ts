import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  create(userId: string, dto: CreateProjectDto) {
    return this.prisma.project.create({
      data: {
        userId,
        name: dto.name,
        description: dto.description,
      },
    });
  }

  async list(userId: string) {
    const items = await this.prisma.project.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { jobs: true, assets: true } },
      },
    });
    return { items, total: items.length };
  }

  async findOne(userId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { _count: { select: { jobs: true, assets: true } } },
    });
    if (!project || project.userId !== userId) {
      throw new NotFoundException('Project not found');
    }
    return project;
  }

  async update(userId: string, projectId: string, dto: UpdateProjectDto) {
    await this.findOne(userId, projectId);
    return this.prisma.project.update({
      where: { id: projectId },
      data: { name: dto.name, description: dto.description },
    });
  }

  async remove(userId: string, projectId: string) {
    await this.findOne(userId, projectId);
    await this.prisma.project.delete({ where: { id: projectId } });
    return { deleted: true, id: projectId };
  }
}
