import { z } from 'zod';
import {
  SELLER_STATUSES,
  type SellerStatus,
  approveSellerSchema,
  rejectSellerSchema,
  blockSellerSchema,
  unblockSellerSchema,
  type ApproveSellerInput,
  type RejectSellerInput,
  type BlockSellerInput,
  type UnblockSellerInput,
} from '@haat/shared-contracts';

export { approveSellerSchema, rejectSellerSchema, blockSellerSchema, unblockSellerSchema };
export type { ApproveSellerInput, RejectSellerInput, BlockSellerInput, UnblockSellerInput };

export const sellerListQuerySchema = z.object({
  status: z.enum([...SELLER_STATUSES, 'ALL'] as unknown as [string, ...string[]]).optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type SellerListQuery = z.infer<typeof sellerListQuerySchema>;
