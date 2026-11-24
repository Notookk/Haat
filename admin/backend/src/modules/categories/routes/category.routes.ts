import { Router } from 'express';
import { requireAuth, requireRole, validate } from '@haat/shared-backend';
import {
  createCategoryHandler,
  deleteCategoryHandler,
  getCategoryHandler,
  listCategoriesHandler,
  updateCategoryHandler,
} from '../controllers/category.controller';
import {
  adminCategoryCreateSchema,
  adminCategoryUpdateSchema,
} from '../validators/category.validator';

export const adminCategoryRouter = Router();

adminCategoryRouter.use(requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'));

// Taxonomy management endpoints
adminCategoryRouter.get('/', listCategoriesHandler);
adminCategoryRouter.get('/:id', getCategoryHandler);
adminCategoryRouter.post('/', validate(adminCategoryCreateSchema, 'body'), createCategoryHandler);
adminCategoryRouter.put('/:id', validate(adminCategoryUpdateSchema, 'body'), updateCategoryHandler);
adminCategoryRouter.patch('/:id', validate(adminCategoryUpdateSchema, 'body'), updateCategoryHandler);
adminCategoryRouter.delete('/:id', deleteCategoryHandler);


