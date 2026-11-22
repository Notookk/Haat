import { z } from 'zod';

export const addressLabelSchema = z.string().trim().min(1).max(40).default('Home');

export const createAddressSchema = z.object({
  label: addressLabelSchema,
  recipientName: z.string().trim().min(2, 'Recipient name is required').max(120),
  phoneNumber: z.string().trim().regex(/^[6-9]\d{9}$/, 'Valid 10-digit phone number is required'),
  line1: z.string().trim().min(3, 'Address line 1 is required').max(200),
  line2: z.string().trim().max(200).optional().nullable(),
  landmark: z.string().trim().max(120).optional().nullable(),
  city: z.string().trim().min(2, 'City is required').max(80),
  state: z.string().trim().min(2, 'State is required').max(80),
  pincode: z.string().trim().regex(/^\d{6}$/, 'Pincode must be 6 digits'),
  isDefault: z.boolean().optional().default(false),
});

export const updateAddressSchema = createAddressSchema.partial();

export type CreateAddressInput = z.infer<typeof createAddressSchema>;
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;

export interface AddressResponseItem {
  id: string;
  _id: string;
  userId: string;
  label: string;
  recipientName: string;
  phoneNumber: string;
  line1: string;
  line2?: string | null;
  landmark?: string | null;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}
