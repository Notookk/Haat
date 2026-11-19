import type { RequestHandler } from 'express';
import type { UserRole } from '@haat/shared-contracts';
import { AppError } from '../lib/AppError';

/** Role gate — must run after `requireAuth` (PRD §6.2). */
export function requireRole(...roles: UserRole[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      next(AppError.unauthorized('Sign in to continue.'));
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(AppError.forbidden('Your account role cannot perform this action.'));
      return;
    }
    next();
  };
}
