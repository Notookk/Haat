import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Wraps an async handler so rejected promises reach the global error middleware.
 * Express 4 does not handle async rejections on its own.
 */
export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    void Promise.resolve(handler(req, res, next)).catch(next);
  };
}
