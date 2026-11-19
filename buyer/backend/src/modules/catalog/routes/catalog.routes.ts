import { Router } from 'express';
import { validate } from '@haat/shared-backend';
import {
  getPublicProductHandler,
  listCategoryTreeHandler,
  listPublicProductsHandler,
} from '../controllers/catalog.controller';
import { productQuerySchema } from '../validators/catalog.validator';

export const catalogRouter = Router();

catalogRouter.get('/categories', listCategoryTreeHandler);
catalogRouter.get('/products', validate(productQuerySchema, 'query'), listPublicProductsHandler);
catalogRouter.get('/products/:slug', getPublicProductHandler);
