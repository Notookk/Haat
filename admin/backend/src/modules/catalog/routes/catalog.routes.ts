import { Router } from 'express';
import { requireAuth, requireRole, validate } from '@haat/shared-backend';
import {
  getProductHandler,
  listProductsHandler,
  moderateProductHandler,
} from '../controllers/catalog.controller';
import { catalogListQuerySchema, moderateProductSchema } from '../validators/catalog.validator';
import { rejectAdminWrites } from '../../../middleware/rejectAdminWrites';

export const adminCatalogRouter = Router();

adminCatalogRouter.use(requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'));

// Read-only catalog inspection
adminCatalogRouter.get('/', validate(catalogListQuerySchema, 'query'), listProductsHandler);
adminCatalogRouter.get('/:id', getProductHandler);

// Admin Product Moderation (Suspend / Reinstate)
adminCatalogRouter.patch('/:id/moderation', validate(moderateProductSchema, 'body'), moderateProductHandler);
adminCatalogRouter.post('/:id/moderation', validate(moderateProductSchema, 'body'), moderateProductHandler);

// Strictly reject direct product creation, editing, or deletion (authoring is owned by sellers)
adminCatalogRouter.post('*', rejectAdminWrites);
adminCatalogRouter.put('*', rejectAdminWrites);
adminCatalogRouter.patch('*', rejectAdminWrites);
adminCatalogRouter.delete('*', rejectAdminWrites);
