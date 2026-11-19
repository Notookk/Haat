import { Router } from 'express';
import { requireAuth } from '@haat/shared-backend';
import { sellerDashboardStatsHandler } from '../controllers/dashboard.controller';

export const sellerDashboardRouter = Router();

sellerDashboardRouter.use(requireAuth);
sellerDashboardRouter.get('/stats', sellerDashboardStatsHandler);
