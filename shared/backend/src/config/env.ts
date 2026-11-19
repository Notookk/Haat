import { resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

// Local package .env wins; fall back to the monorepo root .env.
loadEnv({ path: resolve(process.cwd(), '.env') });
loadEnv({ path: resolve(process.cwd(), '..', '..', '.env') });

const isProduction = process.env.NODE_ENV === 'production';
const DEV_ACCESS_SECRET = 'dev_only_access_secret_change_me_32_chars';
const DEV_REFRESH_SECRET = 'dev_only_refresh_secret_change_me_32chars';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // Dynamic Ports
  BUYER_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  BUYER_BACKEND_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  SELLER_PORT: z.coerce.number().int().min(1).max(65535).default(7000),
  SELLER_BACKEND_PORT: z.coerce.number().int().min(1).max(65535).default(7100),
  ADMIN_PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  ADMIN_BACKEND_PORT: z.coerce.number().int().min(1).max(65535).default(6000),
  WS_PORT: z.coerce.number().int().min(1).max(65535).default(8000),

  // URLs
  BUYER_URL: z.string().url().default('http://localhost:3000'),
  SELLER_URL: z.string().url().default('http://localhost:7000'),
  ADMIN_URL: z.string().url().default('http://localhost:5000'),
  BUYER_API_URL: z.string().url().default('http://localhost:4000'),
  SELLER_API_URL: z.string().url().default('http://localhost:7100'),
  ADMIN_API_URL: z.string().url().default('http://localhost:6000'),
  WS_URL: z.string().default('ws://localhost:8000'),

  // Backwards compatibility fallbacks
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  API_URL: z.string().url().default('http://localhost:4000'),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),

  MONGODB_URI: z.string().min(1).default('mongodb://127.0.0.1:27017/haat'),
  MONGODB_DB_NAME: z.string().min(1).default('haat'),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  REFRESH_COOKIE_NAME: z.string().default('haat_rt'),
  BCRYPT_COST: z.coerce.number().int().min(10).max(15).default(12),

  // Admin Initial Bootstrap Credentials (PRD §5.10 / Dev default only)
  ADMIN_BOOTSTRAP_EMAIL: z.string().email().default('admin@haat.com'),
  ADMIN_BOOTSTRAP_PASSWORD: z.string().min(8).default('admin@123456'),

  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),

  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  CLOUDINARY_UPLOAD_FOLDER: z.string().default('Haat'),

  INTERNAL_EVENT_SECRET: z.string().default('haat_internal_event_bus_secret_key_32chars'),
});

const parsed = envSchema.safeParse({
  ...process.env,
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET ?? (isProduction ? undefined : DEV_ACCESS_SECRET),
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET ?? (isProduction ? undefined : DEV_REFRESH_SECRET),
});

if (!parsed.success) {
  console.error('Invalid environment configuration:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
export const isDev = env.NODE_ENV === 'development';
