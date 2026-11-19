import { Router } from 'express';
import { validate, requireAuth } from '@haat/shared-backend';
import {
  sellerLoginHandler,
  sellerRegisterHandler,
  sellerRefreshHandler,
  sellerLogoutHandler,
  sellerMeHandler,
  sellerChangePasswordHandler,
} from '../controllers/auth.controller';
import { sellerLoginSchema, sellerRegisterSchema } from '../validators/auth.validator';

export const sellerAuthRouter = Router();

sellerAuthRouter.post('/login', validate(sellerLoginSchema, 'body'), sellerLoginHandler);
sellerAuthRouter.post('/register', validate(sellerRegisterSchema, 'body'), sellerRegisterHandler);
sellerAuthRouter.post('/refresh', sellerRefreshHandler);
sellerAuthRouter.post('/logout', sellerLogoutHandler);
sellerAuthRouter.get('/me', requireAuth, sellerMeHandler);
sellerAuthRouter.patch('/change-password', requireAuth, sellerChangePasswordHandler);
