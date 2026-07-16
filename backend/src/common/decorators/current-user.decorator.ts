import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
}

/**
 * Extracts the authenticated user (attached by JwtStrategy) from the request.
 * Optionally returns a single property: @CurrentUser('id')
 */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthUser | undefined;
    if (!user) {
      throw new UnauthorizedException('User not found in request context');
    }
    return data ? user[data] : user;
  },
);
