import { Router } from 'express';
import { requireAuth, validate } from '@haat/shared-backend';
import { createProductSchema, updateProductSchema } from '@haat/shared-contracts';
import {
  listMyProductsHandler,
  getMyProductHandler,
  createProductHandler,
  updateProductHandler,
  archiveProductHandler,
  adjustStockHandler,
} from '../controllers/product.controller';

export const sellerProductRouter = Router();

sellerProductRouter.use(requireAuth);

sellerProductRouter.get('/', listMyProductsHandler);
sellerProductRouter.get('/:id', getMyProductHandler);
sellerProductRouter.post('/', validate(createProductSchema, 'body'), createProductHandler);
sellerProductRouter.put('/:id', validate(updateProductSchema, 'body'), updateProductHandler);
sellerProductRouter.delete('/:id', archiveProductHandler);
sellerProductRouter.patch('/:id/stock', adjustStockHandler);
