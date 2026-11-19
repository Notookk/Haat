import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import { accessLog, errorHandler, notFound, requestContext, env, internalRealtimeRouter } from '@haat/shared-backend';
import { adminApiRouter } from './routes';

export function createAdminApp(): Express {
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
      service: 'admin-api',
      uptimeSeconds: Math.round(process.uptime()),
      env: env.NODE_ENV,
    });
  });

  app.use('/api/v1', internalRealtimeRouter);
  app.use('/api/v1/admin', adminApiRouter);
  app.use('/api/v1', adminApiRouter);
  // Robust alias to absorb any client proxy or path prefix duplication
  app.use('/api/v1/api/v1/admin', adminApiRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
