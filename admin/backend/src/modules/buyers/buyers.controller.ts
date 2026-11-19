import type { Request, Response } from 'express';
import { asyncHandler, sendSuccess } from '@haat/shared-backend';
import { adminBuyerService } from './buyers.service';

export const listBuyersHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await adminBuyerService.listBuyers({
    search: typeof req.query.search === 'string' ? req.query.search : undefined,
    page: req.query.page ? Number(req.query.page) : 1,
    limit: req.query.limit ? Number(req.query.limit) : 20,
  });
  return sendSuccess(res, result);
});

export const getBuyerHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await adminBuyerService.getBuyer(req.params.id);
  return sendSuccess(res, result);
});
