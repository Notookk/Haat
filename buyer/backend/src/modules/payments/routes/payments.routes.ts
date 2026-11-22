import { Router } from 'express';
import { requireAuth, validate } from '@haat/shared-backend';
import {
  createPaymentIntentSchema,
  verifyPaymentSignatureSchema,
} from '@haat/shared-contracts';
import {
  createPaymentIntentHandler,
  verifyPaymentHandler,
  webhookHandler,
} from '../controllers/payments.controller';

export const paymentsRouter = Router();

paymentsRouter.post('/create-order', requireAuth, validate(createPaymentIntentSchema), createPaymentIntentHandler);
paymentsRouter.post('/verify', requireAuth, validate(verifyPaymentSignatureSchema), verifyPaymentHandler);
paymentsRouter.post('/webhook', webhookHandler);
