import { asyncHandler, sendSuccess, HttpStatus } from '@haat/shared-backend';
import {
  submitRfq,
  listBuyerRfqs,
  getRfqDetails,
  listSellerRfqs,
  createQuotation,
  acceptQuotation,
  rejectQuotation,
  requestQuotationRevision,
} from '../services/rfq.service';

export const submitRfqHandler = asyncHandler(async (req, res) => {
  const buyerId = req.user!.id;
  const rfq = await submitRfq(buyerId, req.body);
  return sendSuccess(res, { rfq }, HttpStatus.CREATED);
});

export const listBuyerRfqsHandler = asyncHandler(async (req, res) => {
  const buyerId = req.user!.id;
  const rfqs = await listBuyerRfqs(buyerId);
  return sendSuccess(res, { rfqs });
});

export const getRfqDetailsHandler = asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const details = await getRfqDetails(req.params.id, userId);
  return sendSuccess(res, details);
});

export const listSellerRfqsHandler = asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const rfqs = await listSellerRfqs(userId);
  return sendSuccess(res, { rfqs });
});

export const createQuotationHandler = asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const quotation = await createQuotation(userId, req.params.id, req.body);
  return sendSuccess(res, { quotation }, HttpStatus.CREATED);
});

export const acceptQuotationHandler = asyncHandler(async (req, res) => {
  const buyerId = req.user!.id;
  const result = await acceptQuotation(buyerId, req.params.rfqId, req.params.quotationId);
  return sendSuccess(res, result);
});

export const rejectQuotationHandler = asyncHandler(async (req, res) => {
  const buyerId = req.user!.id;
  const quotation = await rejectQuotation(buyerId, req.params.rfqId, req.params.quotationId);
  return sendSuccess(res, { quotation });
});

export const requestRevisionHandler = asyncHandler(async (req, res) => {
  const buyerId = req.user!.id;
  const quotation = await requestQuotationRevision(
    buyerId,
    req.params.rfqId,
    req.params.quotationId,
    req.body,
  );
  return sendSuccess(res, { quotation });
});
