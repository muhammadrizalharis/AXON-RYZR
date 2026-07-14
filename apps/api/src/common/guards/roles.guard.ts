import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthUser } from '../decorators/current-user.decorator';

/**
 * Role hierarchy: SUPER_ADMIN inherits ADMIN, ADMIN inherits USER.
 */
const ROLE_RANK: Record<Role, number> = {
  [Role.USER]: 0,
  [Role.ADMIN]: 1,
  [Role.SUPER_ADMIN]: 2,
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    const authUser = user as AuthUser | undefined;

    if (!authUser) {
      throw new ForbiddenException('Missing authenticated user');
    }

    const userRank = ROLE_RANK[authUser.role as Role] ?? -1;
    const minRequiredRank = Math.min(
      ...requiredRoles.map((r) => ROLE_RANK[r]),
    );

    if (userRank < minRequiredRank) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
