import type { RequestHandler } from 'express';
import { ERROR_CODES } from '@haat/shared';
import { AppError } from '../lib/AppError';

interface Bucket {
  hits: number[];
}

/**
 * Small in-process sliding-window limiter for auth endpoints.
 * Redis-backed limiting across nodes lands with Part 3 (`TSK-P10-02`); this is the
 * single-node guard that prevents trivial credential stuffing in Part 1.
 */
export function rateLimit(options: { windowMs: number; max: number; scope: string }): RequestHandler {
  const buckets = new Map<string, Bucket>();
  const { windowMs, max, scope } = options;

  return (req, _res, next) => {
    const body = req.body as { identifier?: unknown; phoneNumber?: unknown } | undefined;
    const identity =
      typeof body?.identifier === 'string'
        ? body.identifier
        : typeof body?.phoneNumber === 'string'
          ? body.phoneNumber
          : '';
    const key = `${scope}:${req.ip ?? 'unknown'}:${identity.slice(0, 80)}`;
    const now = Date.now();

    const bucket = buckets.get(key) ?? { hits: [] };
    bucket.hits = bucket.hits.filter((at) => now - at < windowMs);

    if (bucket.hits.length >= max) {
      buckets.set(key, bucket);
      next(
        new AppError(
          ERROR_CODES.RATE_LIMITED,
          'Too many attempts. Wait a few minutes and try again.',
          429,
        ),
      );
      return;
    }

    bucket.hits.push(now);
    buckets.set(key, bucket);

    // Cheap unbounded-growth guard: drop the oldest half when the map gets large.
    if (buckets.size > 5_000) {
      const cutoff = now - windowMs;
      for (const [bucketKey, value] of buckets) {
        if (value.hits.every((at) => at < cutoff)) buckets.delete(bucketKey);
      }
    }

    next();
  };
}
