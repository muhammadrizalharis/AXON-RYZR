import { Role } from '@prisma/client';

/**
 * Access-token JWT payload.
 */
export interface JwtPayload {
  sub: string; // user id
  email: string;
  role: Role;
}

/**
 * Refresh-token JWT payload (adds a token id for rotation/revocation).
 */
export interface JwtRefreshPayload extends JwtPayload {
  jti: string; // refresh token record id
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}
