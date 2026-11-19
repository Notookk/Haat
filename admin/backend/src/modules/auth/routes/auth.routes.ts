import { Router } from 'express';
import { requireAuth, requireRole, rateLimit, validate } from '@haat/shared-backend';
import {
  adminLoginHandler,
  adminRefreshHandler,
  adminLogoutHandler,
  adminMeHandler,
} from '../controllers/auth.controller';
import { adminLoginSchema } from '../validators/auth.validator';

export const adminAuthRouter = Router();

const loginLimiter = rateLimit({ scope: 'admin:auth:login', windowMs: 15 * 60_000, max: 10 });

adminAuthRouter.post('/login', loginLimiter, validate(adminLoginSchema, 'body'), adminLoginHandler);
adminAuthRouter.post('/refresh', adminRefreshHandler);
adminAuthRouter.post('/logout', adminLogoutHandler);
adminAuthRouter.get('/me', requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'), adminMeHandler);
