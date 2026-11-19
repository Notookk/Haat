import { Router } from 'express';
import {
  AppError,
  asyncHandler,
  createUploadSignature,
  MAX_IMAGE_BYTES,
  requireAuth,
  requireRole,
  sendSuccess,
} from '@haat/shared-backend';

export const uploadRouter = Router();

uploadRouter.post(
  '/signature',
  requireAuth,
  requireRole('SELLER'),
  asyncHandler(async (req, res) => {
    if (!req.user) throw AppError.unauthorized('Sign in to continue.');
    const upload = await createUploadSignature(req.user.id);
    return sendSuccess(res, { upload, maxImageBytes: MAX_IMAGE_BYTES });
  }),
);
