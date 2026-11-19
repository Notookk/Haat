import { Router } from 'express';
import { requireAuth, requireRole, validate } from '@haat/shared-backend';
import {
  getSellerHandler,
  getSellerStatsHandler,
  getSellerStatusHistoryHandler,
  getSellerAnalyticsHandler,
  listSellersHandler,
  approveSellerHandler,
  rejectSellerHandler,
  blockSellerHandler,
  unblockSellerHandler,
} from '../controllers/seller.controller';
import {
  sellerListQuerySchema,
  approveSellerSchema,
  rejectSellerSchema,
  blockSellerSchema,
  unblockSellerSchema,
} from '../validators/seller.validator';

export const adminSellerRouter = Router();

adminSellerRouter.use(requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'));

// Seller Directory & Analytics endpoints
adminSellerRouter.get('/stats', getSellerStatsHandler);
adminSellerRouter.get('/', validate(sellerListQuerySchema, 'query'), listSellersHandler);
adminSellerRouter.get('/:id', getSellerHandler);
adminSellerRouter.get('/:id/history', getSellerStatusHistoryHandler);
adminSellerRouter.get('/:id/analytics', getSellerAnalyticsHandler);

// Active / Approve & Block / Unblock actions
adminSellerRouter.post('/:id/approve', validate(approveSellerSchema, 'body'), approveSellerHandler);
adminSellerRouter.post('/:id/reject', validate(rejectSellerSchema, 'body'), rejectSellerHandler);
adminSellerRouter.post('/:id/block', validate(blockSellerSchema, 'body'), blockSellerHandler);
adminSellerRouter.post('/:id/unblock', validate(unblockSellerSchema, 'body'), unblockSellerHandler);
