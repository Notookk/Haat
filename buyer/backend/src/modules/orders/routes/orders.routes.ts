import { Router } from 'express';
import { requireAuth, validate } from '@haat/shared-backend';
import { updateOrderStatusSchema, cancelOrderSchema } from '@haat/shared-contracts';
import {
  listBuyerOrdersHandler,
  getOrderDetailsHandler,
  listSellerOrdersHandler,
  updateOrderStatusHandler,
  cancelBuyerOrderHandler,
  getOrderReceiptHandler,
} from '../controllers/orders.controller';

// Buyer Orders Router
export const ordersRouter = Router();
ordersRouter.use(requireAuth);

ordersRouter.get('/', listBuyerOrdersHandler);
ordersRouter.get('/:id', getOrderDetailsHandler);
ordersRouter.get('/:id/receipt', getOrderReceiptHandler);
ordersRouter.post('/:id/cancel', validate(cancelOrderSchema), cancelBuyerOrderHandler);

// Seller Fulfilment Router
export const sellerOrdersRouter = Router();
sellerOrdersRouter.use(requireAuth);

sellerOrdersRouter.get('/', listSellerOrdersHandler);
sellerOrdersRouter.get('/:id', getOrderDetailsHandler);
sellerOrdersRouter.get('/:id/receipt', getOrderReceiptHandler);
sellerOrdersRouter.patch('/:id/status', validate(updateOrderStatusSchema), updateOrderStatusHandler);
