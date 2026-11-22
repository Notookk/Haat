import { Router } from 'express';
import { requireAuth, validate } from '@haat/shared-backend';
import { checkoutInitiateSchema } from '@haat/shared-contracts';
import { initiateCheckoutHandler } from '../controllers/checkout.controller';

export const checkoutRouter = Router();

checkoutRouter.use(requireAuth);
checkoutRouter.post('/initiate', validate(checkoutInitiateSchema), initiateCheckoutHandler);
