import type { Request, Response } from 'express';
import { z } from 'zod';
import { AppError, asyncHandler, sendSuccess } from '@haat/shared-backend';
import { sellerOrderService } from '../services/order.service';

function getSellerId(req: Request): string {
  const seller = (req as unknown as { seller?: { _id: string | { toString: () => string } } }).seller;
  if (!seller) throw AppError.forbidden('Active seller profile required.');
  return seller._id.toString();
}

const updateStatusSchema = z.object({
  status: z.string().min(1, 'Status is required'),
  reason: z.string().optional(),
});

export const listSellerOrdersHandler = asyncHandler(async (req: Request, res: Response) => {
  const sellerId = getSellerId(req);
  const { status, search, page, limit } = req.query;

  const result = await sellerOrderService.listOrders(sellerId, {
    status: typeof status === 'string' ? status : undefined,
    search: typeof search === 'string' ? search : undefined,
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
  });

  return sendSuccess(res, result);
});

export const getSellerOrderHandler = asyncHandler(async (req: Request, res: Response) => {
  const sellerId = getSellerId(req);
  const order = await sellerOrderService.getOrder(sellerId, req.params.id);
  return sendSuccess(res, { order });
});

export const updateSellerOrderStatusHandler = asyncHandler(async (req: Request, res: Response) => {
  const sellerId = getSellerId(req);
  const parsed = updateStatusSchema.parse(req.body);
  const order = await sellerOrderService.updateOrderStatus(sellerId, req.params.id, parsed.status, parsed.reason);
  return sendSuccess(res, { order });
});
