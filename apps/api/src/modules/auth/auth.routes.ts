import { Router } from 'express';
import { loginSchema, registerSchema } from '@haat/shared';
import { validate } from '../../middleware/validate';
import { requireAuth } from '../../middleware/auth';
import { rateLimit } from '../../middleware/rateLimit';
import { loginHandler, logoutHandler, meHandler, refreshHandler, registerHandler } from './auth.controller';

export const authRouter = Router();

const loginLimiter = rateLimit({ scope: 'auth:login', windowMs: 15 * 60_000, max: 10 });
const registerLimiter = rateLimit({ scope: 'auth:register', windowMs: 60 * 60_000, max: 10 });

authRouter.post('/register', registerLimiter, validate(registerSchema), registerHandler);
authRouter.post('/login', loginLimiter, validate(loginSchema), loginHandler);
authRouter.post('/refresh', refreshHandler);
authRouter.post('/logout', logoutHandler);
authRouter.get('/me', requireAuth, meHandler);
