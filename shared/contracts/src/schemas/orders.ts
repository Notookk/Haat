import { z } from 'zod';
import { objectIdSchema } from './catalog';
import { FULFILMENT_STATUSES } from '../enums';

export const updateOrderStatusSchema = z.object({
  status: z.enum(FULFILMENT_STATUSES),
  remarks: z.string().trim().max(500).optional(),
});

export const cancelOrderSchema = z.object({
  reason: z.string().trim().min(3, 'Cancellation reason is required').max(500),
});

export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;
