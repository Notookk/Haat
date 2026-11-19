import { z } from 'zod';

export const sellerLoginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(3, 'Seller email or phone number is required')
    .refine((val) => val.includes('@') || /^\d{10}$/.test(val), {
      message: 'Enter a valid email address or 10-digit phone number',
    }),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type SellerLoginInput = z.infer<typeof sellerLoginSchema>;

export const sellerRegisterSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name is required (min 2 characters)'),
  phoneNumber: z.string().regex(/^\d{10}$/, 'Enter a valid 10-digit Indian mobile number'),
  email: z.string().trim().email('Enter a valid business email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type SellerRegisterInput = z.infer<typeof sellerRegisterSchema>;
