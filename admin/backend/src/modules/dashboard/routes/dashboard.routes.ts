import { Router } from 'express';
import { requireAuth, requireRole } from '@haat/shared-backend';
import { getDashboardSummaryHandler } from '../controllers/dashboard.controller';

export const adminDashboardRouter = Router();

adminDashboardRouter.use(requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'));
adminDashboardRouter.get('/stats', getDashboardSummaryHandler);
