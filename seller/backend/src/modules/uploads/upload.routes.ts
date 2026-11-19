import { Router } from 'express';
import {
  AppError,
  asyncHandler,
  createUploadSignature,
  MAX_IMAGE_BYTES,
  requireAuth,
  sendSuccess,
} from '@haat/shared-backend';

export const sellerUploadRouter = Router();

sellerUploadRouter.post(
  '/signature',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!req.user) throw AppError.unauthorized('Sign in to continue.');
    const { productId } = req.body ?? {};
    const upload = await createUploadSignature(req.user.id, {
      productId: typeof productId === 'string' && productId.trim() ? productId.trim() : undefined,
    });
    return sendSuccess(res, { upload, maxImageBytes: MAX_IMAGE_BYTES });
  }),
);
