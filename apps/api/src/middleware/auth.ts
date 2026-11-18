import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { ERROR_CODES, USER_ROLES, type UserRole } from '@haat/shared';
import { env } from '../config/env';
import { AppError } from '../lib/AppError';

interface AccessTokenPayload extends jwt.JwtPayload {
  sub: string;
  role: UserRole;
}

function readBearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token;
}

/** Verifies the access token and attaches `req.user`. */
export const requireAuth: RequestHandler = (req, _res, next) => {
  const token = readBearerToken(req.header('authorization'));
  if (!token) {
    next(AppError.unauthorized('Sign in to continue.'));
    return;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
    if (typeof decoded === 'string' || !decoded.sub) {
      next(AppError.unauthorized('Invalid session token.', ERROR_CODES.TOKEN_INVALID));
      return;
    }
    const payload = decoded as AccessTokenPayload;
    const role: UserRole = USER_ROLES.includes(payload.role) ? payload.role : 'BUYER';
    req.user = { id: String(payload.sub), role };
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
