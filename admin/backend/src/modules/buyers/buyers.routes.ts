import { Router } from 'express';
import { requireAuth, requireRole } from '@haat/shared-backend';
import { listBuyersHandler, getBuyerHandler } from './buyers.controller';
import { rejectAdminWrites } from '../../middleware/rejectAdminWrites';

export const adminBuyersRouter = Router();

adminBuyersRouter.use(requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'));

// Read-only endpoints
adminBuyersRouter.get('/', listBuyersHandler);
adminBuyersRouter.get('/:id', getBuyerHandler);

// Enforce read-only: reject any write/delete operations
adminBuyersRouter.post('*', rejectAdminWrites);
adminBuyersRouter.put('*', rejectAdminWrites);
adminBuyersRouter.patch('*', rejectAdminWrites);
adminBuyersRouter.delete('*', rejectAdminWrites);
