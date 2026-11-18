import { Router } from 'express';
import { categoryCreateSchema, createProductSchema, productQuerySchema, updateProductSchema } from '@haat/shared';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { createCategoryHandler, listCategoryTreeHandler } from './category.controller';
import {
  archiveProductHandler,
  createProductHandler,
  getMyProductHandler,
  getPublicProductHandler,
  listMyProductsHandler,
  listPublicProductsHandler,
  updateProductHandler,
} from './product.controller';

export const catalogRouter = Router();

// ---- Categories ----
catalogRouter.get('/categories', listCategoryTreeHandler);
catalogRouter.post(
  '/categories',
  requireAuth,
  requireRole('ADMIN', 'SUPER_ADMIN'),
  validate(categoryCreateSchema),
  createCategoryHandler,
);

// ---- Seller product console (declared before '/products/:slug') ----
catalogRouter.get(
  '/products/mine',
  requireAuth,
  requireRole('SELLER'),
  validate(productQuerySchema, 'query'),
  listMyProductsHandler,
);
catalogRouter.get('/products/mine/:id', requireAuth, requireRole('SELLER'), getMyProductHandler);
catalogRouter.post('/products', requireAuth, requireRole('SELLER'), validate(createProductSchema), createProductHandler);
catalogRouter.patch(
  '/products/:id',
  requireAuth,
  requireRole('SELLER'),
  validate(updateProductSchema),
  updateProductHandler,
);
catalogRouter.delete('/products/:id', requireAuth, requireRole('SELLER'), archiveProductHandler);

// ---- Public catalogue ----
catalogRouter.get('/products', validate(productQuerySchema, 'query'), listPublicProductsHandler);
catalogRouter.get('/products/:slug', getPublicProductHandler);
