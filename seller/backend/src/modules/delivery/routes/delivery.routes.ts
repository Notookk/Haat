import { Router } from 'express';
import { requireAuth } from '@haat/shared-backend';
import { requireActiveSeller } from '../../../middleware/requireActiveSeller';
import {
  listSlotsHandler,
  createSlotHandler,
  batchCreateSlotsHandler,
  updateSlotHandler,
  deleteSlotHandler,
  getSlotOrdersHandler,
  getAvailableSlotsHandler,
  getDeliveryConfigHandler,
  updateDeliveryConfigHandler,
} from '../controllers/delivery.controller';

export const sellerDeliveryRouter = Router();

// Public endpoint for buyers / checkout to inspect available slots for a seller
sellerDeliveryRouter.get('/available/:sellerId', getAvailableSlotsHandler);

// Delivery Configuration (operating days, cutoff, lead time, blackout dates)
sellerDeliveryRouter.get('/config', requireAuth, requireActiveSeller, getDeliveryConfigHandler);
sellerDeliveryRouter.patch('/config', requireAuth, requireActiveSeller, updateDeliveryConfigHandler);

// Protected routes (strictly require verified ACTIVE seller account)
sellerDeliveryRouter.get('/slots', requireAuth, requireActiveSeller, listSlotsHandler);
sellerDeliveryRouter.post('/slots', requireAuth, requireActiveSeller, createSlotHandler);
sellerDeliveryRouter.post('/slots/batch', requireAuth, requireActiveSeller, batchCreateSlotsHandler);
sellerDeliveryRouter.patch('/slots/:id', requireAuth, requireActiveSeller, updateSlotHandler);
sellerDeliveryRouter.delete('/slots/:id', requireAuth, requireActiveSeller, deleteSlotHandler);
sellerDeliveryRouter.get('/slots/:id/orders', requireAuth, requireActiveSeller, getSlotOrdersHandler);
