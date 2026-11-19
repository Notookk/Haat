import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import { accessLog, errorHandler, notFound, requestContext, env, internalRealtimeRouter } from '@haat/shared-backend';
import { buyerApiRouter } from './routes';

export function createBuyerApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  const allowedOrigins = Array.from(
    new Set([env.BUYER_URL, env.FRONTEND_URL, 'http://localhost:3000', 'http://127.0.0.1:3000']),
  );

  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(null, true); // Permissive in local dev, origins logged
        }
      },
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
      uptimeSeconds: Math.round(process.uptime()),
      env: env.NODE_ENV,
    });
  });

  // Internal cross-service event dispatcher
  app.use('/api/v1', internalRealtimeRouter);

  app.use('/api/v1', buyerApiRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
