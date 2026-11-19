import { asyncHandler, sendSuccess } from '@haat/shared-backend';
import { dashboardService } from '../services/dashboard.service';

export const getDashboardSummaryHandler = asyncHandler(async (_req, res) => {
  const summary = await dashboardService.getDashboardSummary();
  return sendSuccess(res, summary);
});
