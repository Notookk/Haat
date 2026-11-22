import { asyncHandler, sendSuccess, HttpStatus } from '@haat/shared-backend';
import {
  getAvailableSlots,
  createSellerSlot,
  listSellerSlots,
  updateSellerSlot,
  deleteSellerSlot,
  addBlackoutDate,
  listBlackoutDates,
  getSlotOrders,
} from '../services/delivery.service';

export const getAvailableSlotsHandler = asyncHandler(async (req, res) => {
  const sellerId = String(req.query.sellerId);
  const dateStr = String(req.query.date);
  const data = await getAvailableSlots(sellerId, dateStr);
  return sendSuccess(res, data);
});

export const createSellerSlotHandler = asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const slot = await createSellerSlot(userId, req.body);
  return sendSuccess(res, { slot }, HttpStatus.CREATED);
});

export const listSellerSlotsHandler = asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const slots = await listSellerSlots(userId);
  return sendSuccess(res, { slots });
});

export const updateSellerSlotHandler = asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const slot = await updateSellerSlot(userId, req.params.id, req.body);
  return sendSuccess(res, { slot });
});

export const deleteSellerSlotHandler = asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const result = await deleteSellerSlot(userId, req.params.id);
  return sendSuccess(res, result);
});

export const addBlackoutDateHandler = asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const blackout = await addBlackoutDate(userId, req.body);
  return sendSuccess(res, { blackout }, HttpStatus.CREATED);
});

export const listBlackoutDatesHandler = asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const blackouts = await listBlackoutDates(userId);
  return sendSuccess(res, { blackouts });
});

export const getSlotOrdersHandler = asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const data = await getSlotOrders(userId, req.params.id);
  return sendSuccess(res, data);
});
