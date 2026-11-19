import { Router } from 'express';
import {
  listSellerOrdersHandler,
  getSellerOrderHandler,
  updateSellerOrderStatusHandler,
} from '../controllers/order.controller';

export const sellerOrderRouter = Router();

sellerOrderRouter.get('/', listSellerOrdersHandler);
sellerOrderRouter.get('/:id', getSellerOrderHandler);
sellerOrderRouter.patch('/:id/status', updateSellerOrderStatusHandler);
