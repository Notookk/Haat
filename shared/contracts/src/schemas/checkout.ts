import { z } from 'zod';
import { objectIdSchema } from './catalog';

export const checkoutItemSchema = z.object({
  productId: objectIdSchema,
  variantId: objectIdSchema.nullable().optional(),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
});

export const shippingAddressInputSchema = z.object({
  name: z.string().trim().min(2, 'Name is required'),
  phone: z.string().trim().regex(/^\+?[1-9]\d{9,14}$/, 'Valid phone number is required'),
  addressLine1: z.string().trim().min(2, 'Address line 1 is required'),
  addressLine2: z.string().trim().optional(),
  city: z.string().trim().min(2, 'City is required'),
  state: z.string().trim().optional().default('General').transform((v) => (v && v.length >= 2 ? v : 'General')),
  pincode: z.string().trim().regex(/^\d{6}$/, 'Pincode must be 6 digits'),
});

export const checkoutInitiateSchema = z.object({
  items: z.array(checkoutItemSchema).min(1, 'At least one item required for checkout'),
  deliverySlotId: z.string().optional().nullable(),
  deliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Delivery date must be YYYY-MM-DD'),
  shippingAddress: shippingAddressInputSchema,
  idempotencyKey: z.string().trim().min(8, 'Valid idempotency key required'),
  paymentMethod: z.enum(['ONLINE', 'COD']).default('ONLINE'),
});

export type CheckoutItemInput = z.infer<typeof checkoutItemSchema>;
export type ShippingAddressInput = z.infer<typeof shippingAddressInputSchema>;
export type CheckoutInitiateInput = z.infer<typeof checkoutInitiateSchema>;
