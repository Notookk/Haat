import type { RequestHandler } from 'express';
import type { ZodTypeAny } from 'zod';
import { AppError } from '../lib/AppError';

type Source = 'body' | 'query' | 'params';

/**
 * Validates and *replaces* the request payload with the parsed result.
 * Strips unknown keys so nothing unvalidated reaches a Mongoose query (PRD §15.5).
 */
export function validate(schema: ZodTypeAny, source: Source = 'body'): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      next(
        AppError.validation(
          'Request validation failed.',
          result.error.issues.map((issue) => ({
            path: [source, ...issue.path.map(String)].join('.'),
            message: issue.message,
          })),
        ),
      );
      return;
    }
    Object.assign(req, { [source]: result.data });
    next();
  };
}
