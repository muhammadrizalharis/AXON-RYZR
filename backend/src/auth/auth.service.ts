import {
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role, User } from '@prisma/client';
import * as argon2 from 'argon2';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { JwtConfig, QuotaConfig } from '../config/configuration';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthTokens, JwtPayload } from './auth.types';

interface RequestMeta {
  userAgent?: string;
  ipAddress?: string;
}

export type SafeUser = Omit<User, 'passwordHash'>;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly jwtConfig: JwtConfig;
  private readonly quotaConfig: QuotaConfig;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {
    this.jwtConfig = this.config.getOrThrow<JwtConfig>('jwt');
    this.quotaConfig = this.config.getOrThrow<QuotaConfig>('quota');
  }

  async register(
    dto: RegisterDto,
    meta: RequestMeta = {},
  ): Promise<{ user: SafeUser; tokens: AuthTokens }> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      select: { id: true },
    });
    if (existing) {
      throw new ForbiddenException('Email is already registered');
    }

    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
    });

    // Default credits are runtime-configurable by admins (system_settings),
    // falling back to the env-based quota default.
    const setting = await this.prisma.systemSetting.findUnique({
      where: { id: 1 },
    });
    const startingCredits =
      setting?.defaultUserCredits ?? this.quotaConfig.defaultUserCredits;

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        name: dto.name,
        passwordHash,
        credits: startingCredits,
        role: Role.USER,
      },
    });

    const tokens = await this.issueTokens(user, meta);
    this.logger.log(`New user registered: ${user.email}`);
    return { user: this.sanitize(user), tokens };
  }

  async login(
    dto: LoginDto,
    meta: RequestMeta = {},
  ): Promise<{ user: SafeUser; tokens: AuthTokens }> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    // Constant-ish response to avoid user enumeration.
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await argon2.verify(user.passwordHash, dto.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new ForbiddenException('Account is disabled');
    }

    const tokens = await this.issueTokens(user, meta);
    return { user: this.sanitize(user), tokens };
  }

  /**
   * Rotates the refresh token: validates the presented token against the stored
   * hash, revokes it, and issues a fresh token pair.
   */
  async refresh(
    userId: string,
    tokenId: string,
    rawRefreshToken: string,
    meta: RequestMeta = {},
  ): Promise<AuthTokens> {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { id: tokenId },
      include: { user: true },
    });

    if (
      !stored ||
      stored.userId !== userId ||
      stored.revokedAt ||
      stored.expiresAt < new Date()
    ) {
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }

    const matches = await argon2.verify(stored.tokenHash, rawRefreshToken);
    if (!matches) {
      // Possible token reuse/theft — revoke all sessions for safety.
      await this.revokeAllForUser(userId);
      throw new UnauthorizedException('Refresh token mismatch');
    }

    // Revoke the used token (rotation).
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(stored.user, meta);
  }

  async logout(userId: string, tokenId?: string): Promise<void> {
    if (tokenId) {
      await this.prisma.refreshToken.updateMany({
        where: { id: tokenId, userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    } else {
      await this.revokeAllForUser(userId);
    }
  }

  /**
   * Verifies the current password, stores the new Argon2 hash, revokes every
   * refresh token (logs out other devices), and issues a fresh token pair so
   * the current session stays alive.
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    meta: RequestMeta = {},
  ): Promise<{ tokens: AuthTokens }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const valid = await argon2.verify(user.passwordHash, currentPassword);
    if (!valid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const passwordHash = await argon2.hash(newPassword, {
      type: argon2.argon2id,
    });
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    // Kick every other session; caller receives fresh tokens.
    await this.revokeAllForUser(userId);
    const tokens = await this.issueTokens(user, meta);
    this.logger.log(`Password changed for ${user.email}`);
    return { tokens };
  }

  private async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async issueTokens(
    user: User,
    meta: RequestMeta,
  ): Promise<AuthTokens> {
    const tokenId = randomUUID();
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.jwtConfig.accessSecret,
      expiresIn: this.jwtConfig.accessTtl,
    });

    const refreshToken = await this.jwt.signAsync(
      { ...payload, jti: tokenId },
      {
        secret: this.jwtConfig.refreshSecret,
        expiresIn: this.jwtConfig.refreshTtl,
      },
    );

    const tokenHash = await argon2.hash(refreshToken, {
      type: argon2.argon2id,
    });

    await this.prisma.refreshToken.create({
      data: {
        id: tokenId,
        userId: user.id,
        tokenHash,
        expiresAt: this.refreshExpiryDate(),
        userAgent: meta.userAgent,
        ipAddress: meta.ipAddress,
      },
    });

    return { accessToken, refreshToken };
  }

  private refreshExpiryDate(): Date {
    // Parse simple TTL like "7d", "15m", "3600s". Falls back to 7 days.
    const ttl = this.jwtConfig.refreshTtl;
    const match = /^(\d+)([smhd])$/.exec(ttl);
    const now = Date.now();
    if (!match) {
      return new Date(now + 7 * 24 * 60 * 60 * 1000);
    }
    const value = Number(match[1]);
    const unitMs: Record<string, number> = {
      s: 1000,
      m: 60_000,
      h: 3_600_000,
      d: 86_400_000,
    };
    return new Date(now + value * unitMs[match[2]]);
  }

  private sanitize(user: User): SafeUser {
    const { passwordHash: _passwordHash, ...safe } = user;
    return safe;
  }
}
