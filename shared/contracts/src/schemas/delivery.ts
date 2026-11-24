import { z } from 'zod';
import { objectIdSchema } from './catalog';
import { DAYS_OF_WEEK } from '../enums';

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const createDeliverySlotSchema = z
  .object({
    dayOfWeek: z.enum(DAYS_OF_WEEK),
    startTime: z.string().regex(timeRegex, 'Start time must be in HH:mm 24-hour format'),
    endTime: z.string().regex(timeRegex, 'End time must be in HH:mm 24-hour format'),
    maxCapacity: z.number().int().min(1, 'Max capacity must be at least 1'),
    leadTimeHours: z.number().int().min(0, 'Lead time cannot be negative').default(0),
    cutoffTime: z.string().regex(timeRegex, 'Cutoff time must be in HH:mm format').optional().nullable(),
  })
  .refine((data) => data.startTime < data.endTime, {
    message: 'Start time must be before end time',
    path: ['endTime'],
  });

export const updateDeliverySlotSchema = z
  .object({
    startTime: z.string().regex(timeRegex, 'Start time must be in HH:mm 24-hour format').optional(),
    endTime: z.string().regex(timeRegex, 'End time must be in HH:mm 24-hour format').optional(),
    maxCapacity: z.number().int().min(1, 'Max capacity must be at least 1').optional(),
    leadTimeHours: z.number().int().min(0, 'Lead time cannot be negative').optional(),
    cutoffTime: z.string().regex(timeRegex, 'Cutoff time must be in HH:mm format').optional().nullable(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.startTime && data.endTime) {
        return data.startTime < data.endTime;
      }
      return true;
    },
    { message: 'Start time must be before end time', path: ['endTime'] },
  );

export const slotQuerySchema = z.object({
  sellerId: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
});

export const createBlackoutSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
  reason: z.string().max(200).optional(),
});

export type CreateDeliverySlotInput = z.infer<typeof createDeliverySlotSchema>;
export type UpdateDeliverySlotInput = z.infer<typeof updateDeliverySlotSchema>;
export type SlotQueryInput = z.infer<typeof slotQuerySchema>;
export type CreateBlackoutInput = z.infer<typeof createBlackoutSchema>;
