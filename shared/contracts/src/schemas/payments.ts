import { z } from 'zod';
import { objectIdSchema } from './catalog';

export const createPaymentIntentSchema = z.object({
  orderId: objectIdSchema,
});

export const verifyPaymentSignatureSchema = z.object({
  orderId: objectIdSchema,
  razorpay_order_id: z.string().min(1, 'Razorpay order ID is required'),
  razorpay_payment_id: z.string().min(1, 'Razorpay payment ID is required'),
  razorpay_signature: z.string().min(1, 'Razorpay signature is required'),
});

export type CreatePaymentIntentInput = z.infer<typeof createPaymentIntentSchema>;
export type VerifyPaymentSignatureInput = z.infer<typeof verifyPaymentSignatureSchema>;
