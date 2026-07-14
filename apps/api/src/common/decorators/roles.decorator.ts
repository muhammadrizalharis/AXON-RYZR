import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

/**
 * Restricts a route to the given roles. Enforced by RolesGuard.
 */
export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
