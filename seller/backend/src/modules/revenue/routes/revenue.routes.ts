import { Router } from 'express';
import { getRevenueStatsHandler } from '../controllers/revenue.controller';

export const sellerRevenueRouter = Router();

sellerRevenueRouter.get('/stats', getRevenueStatsHandler);
