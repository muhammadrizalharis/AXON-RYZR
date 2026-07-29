import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JobStatus, Role } from '@prisma/client';
import { JobsService } from './jobs.service';
import {
  AuthUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('jobs')
@ApiBearerAuth()
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  list(
    @CurrentUser('id') userId: string,
    @Query('status') status?: JobStatus,
    @Query('skip') skip = '0',
    @Query('take') take = '20',
  ) {
    return this.jobsService.list(userId, {
      status,
      skip: Number(skip),
      take: Number(take),
    });
  }

  // ── Admin oversight (declared before :id routes) ──

  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @Get('admin/all')
  listAll(
    @Query('status') status?: JobStatus,
    @Query('q') q?: string,
    @Query('skip') skip = '0',
    @Query('take') take = '24',
  ) {
    return this.jobsService.listAll({
      status,
      q,
      skip: Number(skip),
      take: Number(take),
    });
  }

  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @Patch('admin/:id/cancel')
  adminCancel(@Param('id', ParseUUIDPipe) id: string) {
    return this.jobsService.adminCancel(id);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const isAdmin = user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN;
    return this.jobsService.findOne(user.id, id, isAdmin);
  }

  @Patch(':id/cancel')
  cancel(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.jobsService.cancel(userId, id);
  }
}
