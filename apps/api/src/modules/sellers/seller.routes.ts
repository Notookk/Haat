import { Router } from 'express';
import { sellerOnboardingSchema } from '@haat/shared';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { getMineHandler, onboardHandler, slugAvailabilityHandler } from './seller.controller';

export const sellerRouter = Router();

/** Public — used by the onboarding form for live slug feedback. */
sellerRouter.get('/slug-available', slugAvailabilityHandler);

// A buyer may upgrade to a seller by completing onboarding; the client refreshes its session after.
sellerRouter.use(requireAuth, requireRole('BUYER', 'SELLER'));
sellerRouter.post('/onboarding', validate(sellerOnboardingSchema), onboardHandler);
sellerRouter.get('/me', getMineHandler);
