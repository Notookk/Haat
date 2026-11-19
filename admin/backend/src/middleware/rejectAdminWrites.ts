import type { RequestHandler } from 'express';

/**
 * Enforces strict read-only authorization for the Admin console.
 * Rejects any write / mutation operations (POST, PUT, PATCH, DELETE) with HTTP 403.
 */
export const rejectAdminWrites: RequestHandler = (_req, res) => {
  return res.status(403).json({
    success: false,
    error: 'FORBIDDEN_READ_ONLY_ADMIN',
    message: 'Admin role is strictly a read-only monitoring and analytics role. Write operations are prohibited.',
  });
};
