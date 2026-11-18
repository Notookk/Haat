import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';

/** Attaches a correlation id to every request and echoes it back (PRD §7.4). */
export const requestContext: RequestHandler = (req, res, next) => {
  const incoming = req.header('x-request-id');
  req.requestId = incoming && incoming.length <= 64 ? incoming : randomUUID();
  res.setHeader('x-request-id', req.requestId);
  next();
};
