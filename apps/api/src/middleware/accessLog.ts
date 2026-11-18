import type { RequestHandler } from 'express';
import { logger } from '../lib/logger';

/** Minimal structured access log: method, path, status, duration, correlation id. */
export const accessLog: RequestHandler = (req, res, next) => {
  const startedAt = process.hrtime.bigint();
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    logger.info('request', {
      requestId: req.requestId,
      method: req.method,
      route: req.originalUrl.split('?')[0],
      status: res.statusCode,
      durationMs: Math.round(durationMs * 10) / 10,
      userId: req.user?.id,
    });
  });
  next();
};
