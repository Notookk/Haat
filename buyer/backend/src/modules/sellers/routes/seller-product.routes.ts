import { Router } from 'express';
import { productQuerySchema } from '@haat/shared-contracts';
import { validate } from '@haat/shared-backend';
import { getPublicProductHandler, listPublicProductsHandler } from '../../catalog/controllers/catalog.controller';

export const productRouter = Router();

// Public catalogue discovery endpoints for buyers (open to all buyers and visitors, no auth required)
productRouter.get('/', validate(productQuerySchema, 'query'), listPublicProductsHandler);
productRouter.get('/:slug', getPublicProductHandler);
