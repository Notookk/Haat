import type { Request, Response } from 'express';
import { AppError, asyncHandler, sendSuccess } from '@haat/shared-backend';
import { sellerRfqService } from '../services/rfq.service';

export const listSellerRfqsHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized('Sign in to continue.');
  const result = await sellerRfqService.listRfqs(req.user.id);
  return sendSuccess(res, result);
});
