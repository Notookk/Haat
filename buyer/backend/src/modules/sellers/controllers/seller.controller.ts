import { z } from 'zod';
import type { SellerOnboardingInput } from '@haat/shared-contracts';
import { AppError, asyncHandler, HttpStatus, sendSuccess } from '@haat/shared-backend';
import {
  getMySellerProfile,
  isStoreSlugAvailable,
  onboardSeller,
  getPublicStorefront,
} from '../services/seller.service';

const slugAvailabilityQuery = z.object({ slug: z.string().trim().min(3).max(48) });

export const getStorefrontHandler = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  if (!slug) throw AppError.validation('Store slug is required.');
  const storefront = await getPublicStorefront(slug);
  return sendSuccess(res, storefront);
});

export const onboardHandler = asyncHandler(async (req, res) => {
  if (!req.user) throw AppError.unauthorized('Sign in to continue.');
  const seller = await onboardSeller(req.user.id, req.body as SellerOnboardingInput);
  return sendSuccess(res, { seller }, HttpStatus.CREATED);
});

export const getMineHandler = asyncHandler(async (req, res) => {
  if (!req.user) throw AppError.unauthorized('Sign in to continue.');
  const seller = await getMySellerProfile(req.user.id);
  return sendSuccess(res, { seller });
});

export const slugAvailabilityHandler = asyncHandler(async (req, res) => {
  const parsed = slugAvailabilityQuery.safeParse(req.query);
  if (!parsed.success) {
    throw AppError.validation('Enter a store link of at least 3 characters.');
  }
  const available = await isStoreSlugAvailable(parsed.data.slug);
  return sendSuccess(res, { slug: parsed.data.slug, available });
});
