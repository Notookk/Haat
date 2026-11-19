import type { Request, Response } from 'express';
import { z } from 'zod';
import type { SellerOnboardingInput } from '@haat/shared-contracts';
import { AppError, asyncHandler, HttpStatus, sendSuccess } from '@haat/shared-backend';
import { sellerProfileService } from '../services/profile.service';
import type { UpdateStoreProfileInput } from '../validators/profile.validator';

const slugAvailabilityQuery = z.object({ slug: z.string().trim().min(3).max(48) });

export const sellerOnboardHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized('Sign in to continue.');
  const seller = await sellerProfileService.onboard(req.user.id, req.body as SellerOnboardingInput);
  return sendSuccess(res, { seller }, HttpStatus.CREATED);
});

export const sellerResubmitHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized('Sign in to continue.');
  const seller = await sellerProfileService.resubmitApplication(req.user.id, req.body as SellerOnboardingInput);
  return sendSuccess(res, { seller, message: 'Application re-submitted for approval.' });
});

export const sellerGetProfileHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized('Sign in to continue.');
  const seller = await sellerProfileService.getMyProfile(req.user.id);
  return sendSuccess(res, { seller });
});

export const sellerUpdateProfileHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized('Sign in to continue.');
  const seller = await sellerProfileService.updateMyProfile(req.user.id, req.body as UpdateStoreProfileInput);
  return sendSuccess(res, { seller });
});

export const sellerSlugAvailabilityHandler = asyncHandler(async (req: Request, res: Response) => {
  const parsed = slugAvailabilityQuery.safeParse(req.query);
  if (!parsed.success) {
    throw AppError.validation('Enter a store link of at least 3 characters.');
  }
  const available = await sellerProfileService.isSlugAvailable(parsed.data.slug);
  return sendSuccess(res, { slug: parsed.data.slug, available });
});
