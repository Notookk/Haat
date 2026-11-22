import { z } from 'zod';
import { objectIdSchema } from './catalog';

export const submitRfqSchema = z.object({
  productId: objectIdSchema,
  sellerId: objectIdSchema,
  variantId: objectIdSchema.nullable().optional(),
  requestedQuantity: z.number().int().min(1, 'Quantity must be at least 1'),
  targetPricePaise: z.number().int().positive('Target price must be positive paise').optional().nullable(),
  deliveryPincode: z.string().trim().regex(/^\d{6}$/, 'Pincode must be 6 digits'),
  preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional().nullable(),
  notes: z.string().trim().max(2000).optional().default(''),
});

export const createQuotationSchema = z.object({
  offeredUnitPricePaise: z.number().int().positive('Offered price must be positive integer paise'),
  minQuantity: z.number().int().min(1, 'Minimum quantity must be at least 1'),
  deliveryFeePaise: z.number().int().min(0, 'Delivery fee cannot be negative').default(0),
  validUntil: z.string().min(1, 'Validity date is required'),
  sellerTerms: z.string().trim().max(2000).optional().default(''),
});

export const updateQuotationSchema = createQuotationSchema.partial();

export const rfqRevisionSchema = z.object({
  notes: z.string().trim().min(5, 'Revision notes must be at least 5 characters').max(2000),
});

export type SubmitRfqInput = z.infer<typeof submitRfqSchema>;
export type CreateQuotationInput = z.infer<typeof createQuotationSchema>;
export type UpdateQuotationInput = z.infer<typeof updateQuotationSchema>;
export type RfqRevisionInput = z.infer<typeof rfqRevisionSchema>;
