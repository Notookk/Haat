import { Router } from 'express';
import { requireAuth, validate } from '@haat/shared-backend';
import { sellerOnboardingSchema } from '@haat/shared-contracts';
import { requireActiveSeller } from '../../../middleware/requireActiveSeller';
import {
  sellerOnboardHandler,
  sellerResubmitHandler,
  sellerGetProfileHandler,
  sellerUpdateProfileHandler,
  sellerSlugAvailabilityHandler,
} from '../controllers/profile.controller';
import { updateStoreProfileSchema } from '../validators/profile.validator';

export const sellerProfileRouter = Router();

sellerProfileRouter.get('/slug-availability', sellerSlugAvailabilityHandler);
sellerProfileRouter.post('/onboard', requireAuth, validate(sellerOnboardingSchema, 'body'), sellerOnboardHandler);
sellerProfileRouter.post('/resubmit', requireAuth, validate(sellerOnboardingSchema, 'body'), sellerResubmitHandler);
sellerProfileRouter.get('/me', requireAuth, sellerGetProfileHandler);
sellerProfileRouter.patch(
  '/me',
  requireAuth,
  requireActiveSeller,
  validate(updateStoreProfileSchema, 'body'),
  sellerUpdateProfileHandler,
);
