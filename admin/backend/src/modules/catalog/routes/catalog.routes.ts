import { Router } from 'express';
import { requireAuth, requireRole, validate } from '@haat/shared-backend';
import { getProductHandler, listProductsHandler } from '../controllers/catalog.controller';
import { catalogListQuerySchema } from '../validators/catalog.validator';
import { rejectAdminWrites } from '../../../middleware/rejectAdminWrites';

export const adminCatalogRouter = Router();

adminCatalogRouter.use(requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'));

// Read-only catalog inspection
adminCatalogRouter.get('/', validate(catalogListQuerySchema, 'query'), listProductsHandler);
adminCatalogRouter.get('/:id', getProductHandler);

// Strictly reject any product creation, editing, or moderation
adminCatalogRouter.post('*', rejectAdminWrites);
adminCatalogRouter.put('*', rejectAdminWrites);
adminCatalogRouter.patch('*', rejectAdminWrites);
adminCatalogRouter.delete('*', rejectAdminWrites);
