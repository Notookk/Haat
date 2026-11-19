import { Router } from 'express';
import { requireAuth } from '@haat/shared-backend';
import { listSellerRfqsHandler } from '../controllers/rfq.controller';

export const sellerRfqRouter = Router();

sellerRfqRouter.use(requireAuth);
sellerRfqRouter.get('/', listSellerRfqsHandler);
