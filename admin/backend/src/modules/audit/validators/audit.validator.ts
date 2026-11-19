import { z } from 'zod';

export const auditListQuerySchema = z.object({
  entityType: z.string().trim().optional(),
  action: z.string().trim().optional(),
  actorUserId: z.string().trim().optional(),
  search: z.string().trim().optional(),
  startDate: z.string().trim().optional(),
  endDate: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
});

export type AuditListQuery = z.infer<typeof auditListQuerySchema>;
