import { Router } from 'express';
import { requireAuth, validate } from '@haat/shared-backend';
import {
  slotQuerySchema,
  createDeliverySlotSchema,
  updateDeliverySlotSchema,
  createBlackoutSchema,
} from '@haat/shared-contracts';
import {
  getAvailableSlotsHandler,
  createSellerSlotHandler,
  listSellerSlotsHandler,
  updateSellerSlotHandler,
  deleteSellerSlotHandler,
  addBlackoutDateHandler,
  listBlackoutDatesHandler,
  getSlotOrdersHandler,
} from '../controllers/delivery.controller';

export const deliveryRouter = Router();

// Public availability endpoint
deliveryRouter.get('/slots', validate(slotQuerySchema, 'query'), getAvailableSlotsHandler);

// Seller slot management router
export const sellerDeliveryRouter = Router();
sellerDeliveryRouter.use(requireAuth);

sellerDeliveryRouter.get('/slots', listSellerSlotsHandler);
sellerDeliveryRouter.post('/slots', validate(createDeliverySlotSchema), createSellerSlotHandler);
sellerDeliveryRouter.get('/slots/:id/orders', getSlotOrdersHandler);
sellerDeliveryRouter.put('/slots/:id', validate(updateDeliverySlotSchema), updateSellerSlotHandler);
sellerDeliveryRouter.patch('/slots/:id', validate(updateDeliverySlotSchema), updateSellerSlotHandler);
sellerDeliveryRouter.delete('/slots/:id', deleteSellerSlotHandler);

sellerDeliveryRouter.get('/blackouts', listBlackoutDatesHandler);
sellerDeliveryRouter.post('/blackouts', validate(createBlackoutSchema), addBlackoutDateHandler);
