import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JobStatus, Role } from '@prisma/client';
import { JobsService } from './jobs.service';
import {
  AuthUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator';

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
