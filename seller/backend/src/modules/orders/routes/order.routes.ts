import { Router } from 'express';
import {
  listSellerOrdersHandler,
  getSellerOrderHandler,
  getSellerOrderReceiptHandler,
  updateSellerOrderStatusHandler,
} from '../controllers/order.controller';

export const sellerOrderRouter = Router();

sellerOrderRouter.get('/', listSellerOrdersHandler);
sellerOrderRouter.get('/:id', getSellerOrderHandler);
sellerOrderRouter.get('/:id/receipt', getSellerOrderReceiptHandler);
sellerOrderRouter.patch('/:id/status', updateSellerOrderStatusHandler);
