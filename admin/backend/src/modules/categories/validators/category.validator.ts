import { z } from 'zod';
import { categoryCreateSchema, objectIdSchema } from '@haat/shared-contracts';

export const adminCategoryCreateSchema = categoryCreateSchema;

export const adminCategoryUpdateSchema = categoryCreateSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type AdminCategoryCreateInput = z.infer<typeof adminCategoryCreateSchema>;
export type AdminCategoryUpdateInput = z.infer<typeof adminCategoryUpdateSchema>;
