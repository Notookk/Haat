import { Router } from 'express';
import { asyncHandler } from '../../lib/asyncHandler';
import { sendSuccess } from '../../lib/http';
import { AppError } from '../../lib/AppError';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { MAX_IMAGE_BYTES, createUploadSignature } from '../../providers/cloudinary';

export const uploadRouter = Router();

uploadRouter.post(
  '/signature',
  requireAuth,
  requireRole('SELLER'),
  asyncHandler(async (req, res) => {
    if (!req.user) throw AppError.unauthorized('Sign in to continue.');
    return sendSuccess(res, { upload: createUploadSignature(req.user.id), maxImageBytes: MAX_IMAGE_BYTES });
  }),
);
