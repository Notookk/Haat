import { ERROR_CODES, type SellerOnboardingInput } from '@haat/shared';
import { AppError } from '../../lib/AppError';
import { SellerProfile, User } from '../../models';
import { toSellerProfileView, type SellerProfileView } from './seller.dto';

export async function onboardSeller(userId: string, input: SellerOnboardingInput): Promise<SellerProfileView> {
  const existing = await SellerProfile.findOne({ userId }).lean();
  if (existing) {
    throw AppError.conflict('You already have a store on HAAT. Open the seller console to manage it.');
  }

  const slugTaken = await SellerProfile.findOne({ storeSlug: input.storeSlug }).select('_id').lean();
  if (slugTaken) {
    throw AppError.conflict('That store link is already taken. Choose another.', ERROR_CODES.DUPLICATE_KEY);
  }

  const gstinTaken = await SellerProfile.findOne({ gstin: input.gstin }).select('_id').lean();
  if (gstinTaken) {
    throw AppError.conflict('This GSTIN is already registered to another store.', ERROR_CODES.DUPLICATE_KEY);
  }

  // Duplicate-key errors from the unique indexes are mapped to 409 by the error middleware.
  const seller = await SellerProfile.create({
    userId,
    storeName: input.storeName,
    storeSlug: input.storeSlug,
    description: input.description ?? null,
    logoUrl: input.logoUrl ?? null,
    bannerUrl: input.bannerUrl ?? null,
    gstin: input.gstin,
    panNumber: input.panNumber,
    bankAccountName: input.bankAccountName,
    bankAccountNo: input.bankAccountNo,
    bankIfscCode: input.bankIfscCode,
    servicePincodes: input.servicePincodes,
    kycStatus: 'PENDING',
    isVerified: false,
    isActive: true,
    onboardingCompletedAt: new Date(),
  });

  // Keep the seller profile shell in sync with the identity record.
  await User.updateOne({ _id: userId, role: 'BUYER' }, { $set: { role: 'SELLER' } });

  return toSellerProfileView(seller.toObject());
}

export async function getMySellerProfile(userId: string): Promise<SellerProfileView | null> {
  const seller = await SellerProfile.findOne({ userId }).lean();
  return seller ? toSellerProfileView(seller) : null;
}

export async function isStoreSlugAvailable(slug: string): Promise<boolean> {
  const taken = await SellerProfile.findOne({ storeSlug: slug }).select('_id').lean();
  return !taken;
}
