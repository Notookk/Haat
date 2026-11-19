import { z } from 'zod';
import { USER_ROLES } from '@haat/shared-contracts';

export const userListQuerySchema = z.object({
  search: z.string().trim().optional(),
  role: z.enum(USER_ROLES).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const updateUserStatusSchema = z.object({
  isActive: z.boolean(),
  reason: z.string().trim().min(3, 'Audit reason is required for account status changes'),
});

export type UserListQuery = z.infer<typeof userListQuerySchema>;
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;
