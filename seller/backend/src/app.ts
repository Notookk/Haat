import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import { accessLog, errorHandler, notFound, requestContext, env, internalRealtimeRouter } from '@haat/shared-backend';
import { sellerApiRouter } from './routes';

export function createSellerApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    cors({
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-Id'],
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(requestContext);
  app.use(accessLog);

  app.get('/health', (_req, res) => {
    const dbState = mongoose.connection.readyState;
    const db = dbState === 1 ? 'up' : 'down';
    res.status(db === 'up' ? 200 : 503).json({
      status: db === 'up' ? 'ok' : 'degraded',
      db,
      service: 'seller-api',
      uptimeSeconds: Math.round(process.uptime()),
      env: env.NODE_ENV,
    });
  });

  // Internal realtime event bus route
  app.use('/api/v1', internalRealtimeRouter);

  // Dedicated seller routes
  app.use('/api/v1/seller', sellerApiRouter);
  // Alias for client convenience
  app.use('/api/v1', sellerApiRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
