import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AdjustCreditsDto } from './dto/adjust-credits.dto';
import {
  CurrentUser,
  AuthUser,
} from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getMe(@CurrentUser('id') userId: string) {
    return this.usersService.getProfile(userId);
  }

  @Patch('me')
  updateMe(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(userId, dto.name);
  }

  // ── Admin routes ──────────────────────────────

  @Get()
  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  listUsers(
    @Query('skip') skip = '0',
    @Query('take') take = '20',
  ) {
    return this.usersService.listUsers(Number(skip), Number(take));
  }

  @Patch(':id/credits')
  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  grantCredits(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdjustCreditsDto,
  ) {
    return this.usersService.grantCredits(id, dto.amount, dto.reason);
  }

  @Patch(':id/activate')
  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  activate(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.setActive(id, true);
  }

  @Patch(':id/deactivate')
  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.setActive(id, false);
  }

  @Patch(':id/role/:role')
  @Roles(Role.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  setRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('role') role: Role,
  ) {
    return this.usersService.setRole(id, role);
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  getUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.getProfile(id);
  }
}
