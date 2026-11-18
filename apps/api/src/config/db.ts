import mongoose from 'mongoose';
import { env, isProd } from './env';
import { logger } from '../lib/logger';

mongoose.set('strictQuery', true);
// Prevent NoSQL operator injection via request bodies (PRD §14.11).
mongoose.set('sanitizeFilter', true);
// Indexes are created by migration scripts in production, not on every boot.
mongoose.set('autoIndex', !isProd);

export async function connectDatabase(): Promise<void> {
  mongoose.connection.on('connected', () => logger.info('mongodb connected'));
  mongoose.connection.on('disconnected', () => logger.warn('mongodb disconnected'));
  mongoose.connection.on('error', (error: unknown) => logger.error('mongodb error', { error: String(error) }));

  await mongoose.connect(env.MONGODB_URI, {
    dbName: env.MONGODB_DB_NAME,
    maxPoolSize: 20,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 8000,
  });
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.connection.close();
}
