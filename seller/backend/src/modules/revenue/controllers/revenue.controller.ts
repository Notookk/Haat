import type { Request, Response } from 'express';
import { AppError, asyncHandler, sendSuccess } from '@haat/shared-backend';
import { sellerRevenueService } from '../services/revenue.service';

function getSellerId(req: Request): string {
  const seller = (req as unknown as { seller?: { _id: string | { toString: () => string } } }).seller;
  if (!seller) throw AppError.forbidden('Active seller profile required.');
  return seller._id.toString();
}

export const getRevenueStatsHandler = asyncHandler(async (req: Request, res: Response) => {
  const sellerId = getSellerId(req);
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;

  const data = await sellerRevenueService.getRevenueStats(sellerId, page, limit);
  return sendSuccess(res, data);
});
