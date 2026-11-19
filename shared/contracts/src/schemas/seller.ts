import { z } from 'zod';

export const GSTIN_REGEX = /^[0-9A-Za-z]{15}$/;
export const PAN_REGEX = /^[0-9A-Za-z]{10}$/;
export const IFSC_REGEX = /^[0-9A-Za-z]{8,16}$/;
export const PINCODE_REGEX = /^[1-9][0-9]{5}$/;

export const storeSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Store link must be at least 3 characters')
  .max(48, 'Store link must be at most 48 characters')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and single hyphens');

export const sellerOnboardingSchema = z.object({
  storeName: z.string().trim().min(2, 'Enter your store name').max(80),
  storeSlug: storeSlugSchema.optional(),
  storeAddress: z.string().trim().min(3, 'Store address must be at least 3 characters').max(300).optional(),
  description: z.string().trim().max(600).optional(),
  logoUrl: z.string().url().optional(),
  bannerUrl: z.string().url().optional(),
  gstin: z.string().trim().toUpperCase().regex(GSTIN_REGEX, 'Enter a valid 15-character GSTIN'),
  panNumber: z.string().trim().toUpperCase().regex(PAN_REGEX, 'Enter a valid 10-character PAN'),
  bankAccountName: z.string().trim().min(2).max(120),
  bankAccountNo: z
    .string()
    .trim()
    .regex(/^\d{9,18}$/, 'Account number must be 9–18 digits'),
  bankIfscCode: z.string().trim().toUpperCase().regex(IFSC_REGEX, 'Enter a valid IFSC code'),
  servicePincodes: z
    .array(z.string().trim().regex(PINCODE_REGEX, 'Enter a valid 6-digit pincode'))
    .min(1, 'Add at least one serviceable pincode')
    .max(200, 'List up to 200 pincodes'),
});

export type SellerOnboardingInput = z.infer<typeof sellerOnboardingSchema>;

export const approveSellerSchema = z.object({
  notes: z.string().trim().max(500).optional(),
});
export type ApproveSellerInput = z.infer<typeof approveSellerSchema>;

export const rejectSellerSchema = z.object({
  reason: z.string().trim().min(5, 'Rejection reason must be at least 5 characters').max(500),
});
export type RejectSellerInput = z.infer<typeof rejectSellerSchema>;

export const blockSellerSchema = z.object({
  reason: z.string().trim().min(5, 'Blocking reason must be at least 5 characters').max(500),
});
export type BlockSellerInput = z.infer<typeof blockSellerSchema>;

export const unblockSellerSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});
export type UnblockSellerInput = z.infer<typeof unblockSellerSchema>;
