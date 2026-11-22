import dns from 'node:dns';
import mongoose from 'mongoose';
import { env, isProd } from '../config/env';
import { logger } from '../lib/logger';

// Configure reliable DNS servers for mongodb+srv SRV resolution on Windows
if (env.MONGODB_URI && env.MONGODB_URI.startsWith('mongodb+srv:')) {
  try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
  } catch {
    // Ignore if environment restricts custom DNS
  }
}

mongoose.set('strictQuery', true);
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
    serverSelectionTimeoutMS: 30000,
  });
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.connection.close();
}
