import type { Request, Response } from 'express';
import { z } from 'zod';
import { AppError, asyncHandler, sendSuccess } from '@haat/shared-backend';
import { sellerDeliveryService } from '../services/delivery.service';

const createSlotSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:MM'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:MM'),
  capacity: z.number().int().min(1).default(9999).optional(),
});

const batchCreateSlotsSchema = z.object({
  dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).min(1),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  capacity: z.number().int().min(1),
});

const updateSlotSchema = z.object({
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  capacity: z.number().int().min(1).optional(),
  isActive: z.boolean().optional(),
});

const updateDeliveryConfigSchema = z.object({
  operatingDays: z
    .array(z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']))
    .optional(),
  leadTimeHours: z.number().int().min(0).max(72).optional(),
  dailyCutoffTime: z.string().regex(/^\d{2}:\d{2}$/, 'Cut-off time must be HH:MM').optional(),
  blackoutDates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Dates must be YYYY-MM-DD')).optional(),
  dailySlots: z
    .array(
      z.object({
        startTime: z.string().regex(/^\d{2}:\d{2}$/),
        endTime: z.string().regex(/^\d{2}:\d{2}$/),
        capacity: z.number().int().min(1),
        isActive: z.boolean().optional(),
      }),
    )
    .optional(),
});

function getSellerId(req: Request): string {
  const seller = (req as unknown as { seller?: { _id: string | { toString: () => string } } }).seller;
  if (!seller) throw AppError.forbidden('Active seller profile required.');
  return seller._id.toString();
}

export const getDeliveryConfigHandler = asyncHandler(async (req: Request, res: Response) => {
  const sellerId = getSellerId(req);
  const config = await sellerDeliveryService.getDeliveryConfig(sellerId);
  return sendSuccess(res, { config });
});

export const updateDeliveryConfigHandler = asyncHandler(async (req: Request, res: Response) => {
  const sellerId = getSellerId(req);
  const parsed = updateDeliveryConfigSchema.parse(req.body);
  const config = await sellerDeliveryService.updateDeliveryConfig(sellerId, parsed);
  return sendSuccess(res, { config });
});

export const listSlotsHandler = asyncHandler(async (req: Request, res: Response) => {
  const sellerId = getSellerId(req);
  const date = typeof req.query.date === 'string' ? req.query.date : undefined;
  const slots = await sellerDeliveryService.listSlots(sellerId, date);
  return sendSuccess(res, { slots });
});

export const createSlotHandler = asyncHandler(async (req: Request, res: Response) => {
  const sellerId = getSellerId(req);
  const parsed = createSlotSchema.parse(req.body);
  const slot = await sellerDeliveryService.createSlot(sellerId, parsed);
  return sendSuccess(res, { slot }, 201);
});

export const batchCreateSlotsHandler = asyncHandler(async (req: Request, res: Response) => {
  const sellerId = getSellerId(req);
  const parsed = batchCreateSlotsSchema.parse(req.body);
  const result = await sellerDeliveryService.batchCreateSlots(sellerId, parsed);
  return sendSuccess(res, result, 201);
});

export const updateSlotHandler = asyncHandler(async (req: Request, res: Response) => {
  const sellerId = getSellerId(req);
  const slotId = req.params.id;
  const parsed = updateSlotSchema.parse(req.body);
  const slot = await sellerDeliveryService.updateSlot(sellerId, slotId, parsed);
  return sendSuccess(res, { slot });
});

export const deleteSlotHandler = asyncHandler(async (req: Request, res: Response) => {
  const sellerId = getSellerId(req);
  const slotId = req.params.id;
  const result = await sellerDeliveryService.deleteSlot(sellerId, slotId);
  return sendSuccess(res, result);
});

export const getSlotOrdersHandler = asyncHandler(async (req: Request, res: Response) => {
  const sellerId = getSellerId(req);
  const slotId = req.params.id;
  const result = await sellerDeliveryService.getSlotOrders(sellerId, slotId);
  return sendSuccess(res, result);
});

export const getAvailableSlotsHandler = asyncHandler(async (req: Request, res: Response) => {
  const sellerId = req.params.sellerId;
  const date = req.query.date as string;
  if (!sellerId || !date) {
    throw AppError.badRequest('sellerId and date are required.');
  }
  const slots = await sellerDeliveryService.getAvailableSlots(sellerId, date);
  return sendSuccess(res, { slots });
});
