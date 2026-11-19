import { z } from 'zod';

export const updateStoreProfileSchema = z.object({
  storeName: z.string().trim().min(3).max(80).optional(),
  storeAddress: z.string().trim().max(300).nullable().optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  logoUrl: z.string().trim().url().nullable().optional().or(z.literal('')),
  bannerUrl: z.string().trim().url().nullable().optional().or(z.literal('')),
  isOpen: z.boolean().optional(),
  businessPhone: z.string().trim().max(20).nullable().optional().or(z.literal('')),
  businessEmail: z.string().trim().email().nullable().optional().or(z.literal('')),
  bankAccountName: z.string().trim().min(3).max(120).optional(),
  bankAccountNo: z.string().trim().min(8).max(24).optional(),
  bankIfscCode: z
    .string()
    .trim()
    .regex(/^[0-9A-Za-z]{8,16}$/, 'Enter a valid IFSC code (8–16 characters)')
    .optional(),
  servicePincodes: z.array(z.string().regex(/^\d{6}$/, 'Invalid 6-digit pincode')).optional(),
});

export type UpdateStoreProfileInput = z.infer<typeof updateStoreProfileSchema>;
