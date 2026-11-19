import type { Request, Response } from 'express';
import { AppError, asyncHandler, sendSuccess } from '@haat/shared-backend';
import { sellerDashboardService } from '../services/dashboard.service';

export const sellerDashboardStatsHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized('Sign in to continue.');
  const stats = await sellerDashboardService.getStats(req.user.id);
  return sendSuccess(res, stats);
});
