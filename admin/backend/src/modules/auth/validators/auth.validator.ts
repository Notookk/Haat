import { z } from 'zod';

export const adminLoginSchema = z.object({
  identifier: z.string().trim().min(3, 'Identifier is required'),
  password: z.string().min(1, 'Password is required'),
});

export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
