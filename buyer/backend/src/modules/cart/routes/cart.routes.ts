import { Router } from 'express';
import { requireAuth, validate } from '@haat/shared-backend';
import { addToCartSchema, updateCartItemSchema } from '@haat/shared-contracts';
import {
  getCartHandler,
  addItemHandler,
  updateItemHandler,
  removeItemHandler,
  clearCartHandler,
} from '../controllers/cart.controller';

export const cartRouter = Router();

cartRouter.use(requireAuth);

cartRouter.get('/', getCartHandler);
cartRouter.post('/items', validate(addToCartSchema), addItemHandler);
cartRouter.patch('/items/:productId', validate(updateCartItemSchema), updateItemHandler);
cartRouter.delete('/items/:productId', removeItemHandler);
cartRouter.delete('/', clearCartHandler);
