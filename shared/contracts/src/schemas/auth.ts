import { z } from 'zod';
import { SELF_SIGNUP_ROLES } from '../enums';

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters');

export const emailSchema = z.string().trim().toLowerCase().email('Enter a valid email address');

export const registerSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name').max(80),
  phoneNumber: phoneSchema,
  email: emailSchema.optional(),
  password: passwordSchema,
  role: z.enum(SELF_SIGNUP_ROLES).default('BUYER'),
});

export const loginSchema = z.object({
  identifier: z.string().trim().min(3, 'Enter your phone number or email'),
  password: z.string().min(1, 'Enter your password'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
