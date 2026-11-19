import { Router } from 'express';
import { adminAuthRouter } from '../modules/auth';
import { adminDashboardRouter } from '../modules/dashboard';
import { adminBuyersRouter } from '../modules/buyers';
import { adminSellerRouter } from '../modules/sellers';
import { adminCategoryRouter } from '../modules/categories';
import { adminCatalogRouter } from '../modules/catalog';
import { adminAuditRouter } from '../modules/audit';
import { adminUserRouter } from '../modules/users';
import { adminOrdersRouter } from '../modules/orders';
import { adminTransactionsRouter } from '../modules/transactions';
import { adminAnalyticsRouter } from '../modules/analytics';

export const adminApiRouter = Router();

adminApiRouter.use('/auth', adminAuthRouter);
adminApiRouter.use('/dashboard', adminDashboardRouter);
adminApiRouter.use('/buyers', adminBuyersRouter);
adminApiRouter.use('/sellers', adminSellerRouter);
adminApiRouter.use('/categories', adminCategoryRouter);
adminApiRouter.use('/catalog', adminCatalogRouter);
adminApiRouter.use('/users', adminUserRouter);
adminApiRouter.use('/orders', adminOrdersRouter);
adminApiRouter.use('/transactions', adminTransactionsRouter);
adminApiRouter.use('/analytics', adminAnalyticsRouter);
adminApiRouter.use('/audit-logs', adminAuditRouter);
