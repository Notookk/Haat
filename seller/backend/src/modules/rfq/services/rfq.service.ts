import { AppError, SellerProfile } from '@haat/shared-backend';

export const sellerRfqService = {
  async listRfqs(userId: string) {
    const seller = await SellerProfile.findOne({ userId });
    if (!seller) throw AppError.forbidden('Seller onboarding required.');

    // Phase 7 RFQ & Custom Quotations dependency
    return {
      rfqs: [],
      meta: {
        total: 0,
        page: 1,
        limit: 20,
        dependencyStatus: 'BLOCKED_BY_PHASE_7_RFQ_LIFECYCLE',
      },
    };
  },
};
