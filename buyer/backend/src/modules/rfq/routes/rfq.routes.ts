import { Router } from 'express';
import { requireAuth, validate } from '@haat/shared-backend';
import {
  submitRfqSchema,
  createQuotationSchema,
  rfqRevisionSchema,
} from '@haat/shared-contracts';
import {
  submitRfqHandler,
  listBuyerRfqsHandler,
  getRfqDetailsHandler,
  listSellerRfqsHandler,
  createQuotationHandler,
  acceptQuotationHandler,
  rejectQuotationHandler,
  requestRevisionHandler,
} from '../controllers/rfq.controller';

// Buyer RFQ Router
export const rfqRouter = Router();
rfqRouter.use(requireAuth);

rfqRouter.post('/', validate(submitRfqSchema), submitRfqHandler);
rfqRouter.get('/', listBuyerRfqsHandler);
rfqRouter.get('/:id', getRfqDetailsHandler);
rfqRouter.post('/:rfqId/quotations/:quotationId/accept', acceptQuotationHandler);
rfqRouter.post('/:rfqId/quotations/:quotationId/reject', rejectQuotationHandler);
rfqRouter.post(
  '/:rfqId/quotations/:quotationId/request-revision',
  validate(rfqRevisionSchema),
  requestRevisionHandler,
);

// Seller RFQ Router
export const sellerRfqRouter = Router();
sellerRfqRouter.use(requireAuth);

sellerRfqRouter.get('/', listSellerRfqsHandler);
sellerRfqRouter.get('/:id', getRfqDetailsHandler);
sellerRfqRouter.post('/:id/quotations', validate(createQuotationSchema), createQuotationHandler);
