import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { ERROR_CODES, USER_ROLES, type UserRole } from '@haat/shared-contracts';
import { env } from '../config/env';
import { AppError } from '../lib/AppError';
import { readBearerToken, isAccessTokenRevoked } from '../utils/tokens';

export { readBearerToken };

interface AccessTokenPayload extends jwt.JwtPayload {
  sub: string;
  role: UserRole;
}

/** Verifies the access token and attaches `req.user`. Checks revocation blacklist on logout. */
export const requireAuth: RequestHandler = async (req, _res, next) => {
  const token = readBearerToken(req.header('authorization'));
  if (!token) {
    next(AppError.unauthorized('Sign in to continue.'));
    return;
  }

  try {
    // 1. Verify token is not blacklisted via user logout
    if (await isAccessTokenRevoked(token)) {
      next(AppError.unauthorized('Your session has ended. Sign in again.', ERROR_CODES.TOKEN_INVALID));
      return;
    }

    // 2. Cryptographic signature and natural expiration check
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
    if (typeof decoded === 'string' || !decoded.sub) {
      next(AppError.unauthorized('Invalid session token.', ERROR_CODES.TOKEN_INVALID));
      return;
    }
    const payload = decoded as AccessTokenPayload;
    const role: UserRole = USER_ROLES.includes(payload.role) ? payload.role : 'BUYER';
    const sub = String(payload.sub);
    req.user = { id: sub, userId: sub, role };
    next();
  } catch (error) {
    const expired = error instanceof jwt.TokenExpiredError;
    next(
      expired
        ? AppError.unauthorized('Your session has expired. Refresh and try again.', ERROR_CODES.TOKEN_EXPIRED)
        : AppError.unauthorized('Invalid session token.', ERROR_CODES.TOKEN_INVALID),
    );
  }
};
