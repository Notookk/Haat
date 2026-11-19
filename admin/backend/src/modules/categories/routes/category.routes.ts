import { Router } from 'express';
import { requireAuth, requireRole } from '@haat/shared-backend';
import { getCategoryHandler, listCategoriesHandler } from '../controllers/category.controller';
import { rejectAdminWrites } from '../../../middleware/rejectAdminWrites';

export const adminCategoryRouter = Router();

adminCategoryRouter.use(requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'));

// Read-only taxonomy inspection
adminCategoryRouter.get('/', listCategoriesHandler);
adminCategoryRouter.get('/:id', getCategoryHandler);

// Strictly reject any category creation, updates, or deletions
adminCategoryRouter.post('*', rejectAdminWrites);
adminCategoryRouter.put('*', rejectAdminWrites);
adminCategoryRouter.patch('*', rejectAdminWrites);
adminCategoryRouter.delete('*', rejectAdminWrites);
