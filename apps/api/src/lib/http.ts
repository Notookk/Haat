import type { Response } from 'express';
import type { ApiSuccess, PaginationMeta } from '@haat/shared';

export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

/** Standard success envelope (PRD §14.6). Controllers must not hand-roll JSON. */
export function sendSuccess<T>(
  res: Response,
  data: T,
  status: number = HttpStatus.OK,
  meta?: PaginationMeta,
): Response {
  const body: ApiSuccess<T> = {
    success: true,
    data,
    error: null,
    ...(meta ? { meta } : {}),
  };
  return res.status(status).json(body);
}
