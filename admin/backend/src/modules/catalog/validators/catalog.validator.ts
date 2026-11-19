import { z } from 'zod';

export const catalogListQuerySchema = z.object({
  status: z.enum(['ALL', 'APPROVED', 'SUSPENDED']).default('ALL'),
  search: z.string().trim().optional(),
  categoryId: z.string().trim().optional(),
  sellerId: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CatalogListQuery = z.infer<typeof catalogListQuerySchema>;

export const moderateProductSchema = z.object({
  isApproved: z.boolean(),
  reason: z.string().trim().min(3, 'Moderation reason must be at least 3 characters').max(500),
});

export type ModerateProductInput = z.infer<typeof moderateProductSchema>;
