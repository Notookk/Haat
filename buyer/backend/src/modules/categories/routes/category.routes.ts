import { Router } from 'express';
import { requireAuth, requireRole, validate } from '@haat/shared-backend';
import { createCategoryHandler, listCategoryTreeHandler } from '../controllers/category.controller';
import { categoryCreateSchema } from '../validators/category.validator';

export const categoryRouter = Router();

categoryRouter.get('/', listCategoryTreeHandler);
categoryRouter.post(
  '/',
  requireAuth,
  requireRole('ADMIN', 'SUPER_ADMIN'),
  validate(categoryCreateSchema),
  createCategoryHandler,
);
