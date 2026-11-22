import { z } from 'zod';
import { objectIdSchema } from './catalog';

export const addToCartSchema = z.object({
  productId: objectIdSchema,
  variantId: objectIdSchema.nullable().optional(),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  variantId: objectIdSchema.nullable().optional(),
});

export type AddToCartInput = z.infer<typeof addToCartSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
