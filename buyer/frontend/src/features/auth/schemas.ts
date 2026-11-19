import { z } from 'zod';
import { passwordSchema, phoneSchema } from '@haat/shared-contracts';

export const loginFormSchema = z.object({
  identifier: z.string().trim().min(3, 'Enter your phone number or email'),
  password: z.string().min(1, 'Enter your password'),
});

export type LoginFormValues = z.infer<typeof loginFormSchema>;

export const registerFormSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name').max(80, 'Keep your name under 80 characters'),
  phoneNumber: phoneSchema,
  email: z
    .string()
    .trim()
    .refine((value) => value === '' || /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(value), 'Enter a valid email address'),
  password: passwordSchema,
  role: z.enum(['BUYER', 'SELLER']),
});

export type RegisterFormValues = z.infer<typeof registerFormSchema>;
