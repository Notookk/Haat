import { Router } from 'express';
import { requireAuth, rateLimit, validate } from '@haat/shared-backend';
import {
  loginHandler,
  logoutHandler,
  meHandler,
  refreshHandler,
  registerHandler,
} from '../controllers/auth.controller';
import { loginSchema, registerSchema } from '../validators/auth.validator';

export const authRouter = Router();

const loginLimiter = rateLimit({ scope: 'auth:login', windowMs: 15 * 60_000, max: 10 });
const registerLimiter = rateLimit({ scope: 'auth:register', windowMs: 60 * 60_000, max: 10 });

authRouter.post('/register', registerLimiter, validate(registerSchema), registerHandler);
authRouter.post('/login', loginLimiter, validate(loginSchema), loginHandler);
authRouter.post('/refresh', refreshHandler);
authRouter.post('/logout', logoutHandler);
authRouter.get('/me', requireAuth, meHandler);
