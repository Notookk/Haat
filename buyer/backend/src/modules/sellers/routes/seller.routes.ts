import { Router } from 'express';
import { sellerOnboardingSchema } from '@haat/shared-contracts';
import { requireAuth, requireRole, validate } from '@haat/shared-backend';
import { getMineHandler, onboardHandler, slugAvailabilityHandler } from '../controllers/seller.controller';

export const sellerProfileRouter = Router();

/** Public — used by the onboarding form for live slug feedback. */
sellerProfileRouter.get('/slug-available', slugAvailabilityHandler);

// A buyer may upgrade to a seller by completing onboarding; the client refreshes its session after.
sellerProfileRouter.use(requireAuth, requireRole('BUYER', 'SELLER'));
sellerProfileRouter.post('/onboarding', validate(sellerOnboardingSchema), onboardHandler);
sellerProfileRouter.get('/me', getMineHandler);
