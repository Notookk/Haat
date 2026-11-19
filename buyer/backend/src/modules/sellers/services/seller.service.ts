import { ERROR_CODES, type SellerOnboardingInput } from '@haat/shared-contracts';
import { AppError, SellerProfile, Product, slugify, uniqueSlug } from '@haat/shared-backend';
import { sellerModel } from '../models/seller.model';
import { toSellerProfileView, type SellerProfileView } from '../seller.dto';
import { toProductView } from '../../catalog/catalog.dto';

export async function onboardSeller(userId: string, input: SellerOnboardingInput): Promise<SellerProfileView> {
  const existing = await sellerModel.findByUserId(userId);
  if (existing) {
    throw AppError.conflict('You already have a store on HAAT. Open the seller console to manage it.');
  }

  let storeSlug: string;
  if (input.storeSlug && input.storeSlug.trim()) {
    const slugTaken = await sellerModel.findBySlug(input.storeSlug.trim().toLowerCase());
    if (slugTaken) {
      throw AppError.conflict('That store link is already taken. Choose another.', ERROR_CODES.DUPLICATE_KEY);
    }
    storeSlug = input.storeSlug.trim().toLowerCase();
  } else {
    const base = slugify(input.storeName) || 'store';
    storeSlug = await uniqueSlug(base, async (candidate) => {
      const found = await sellerModel.findBySlug(candidate);
      return Boolean(found);
    });
  }

  const gstinTaken = await sellerModel.findByGstin(input.gstin);
  if (gstinTaken) {
    throw AppError.conflict('This GSTIN is already registered to another store.', ERROR_CODES.DUPLICATE_KEY);
  }

  const seller = await sellerModel.createSellerProfile({
    userId,
    storeName: input.storeName,
    storeSlug,
    storeAddress: input.storeAddress?.trim() ?? null,
    description: input.description ?? null,
    logoUrl: input.logoUrl ?? null,
    bannerUrl: input.bannerUrl ?? null,
    gstin: input.gstin,
    panNumber: input.panNumber,
    bankAccountName: input.bankAccountName,
    bankAccountNo: input.bankAccountNo,
    bankIfscCode: input.bankIfscCode,
    servicePincodes: input.servicePincodes,
    isVerified: false,
    isActive: true,
    onboardingCompletedAt: new Date(),
  });

  await sellerModel.upgradeUserRoleToSeller(userId);

  return toSellerProfileView(seller.toObject());
}

export async function getMySellerProfile(userId: string): Promise<SellerProfileView | null> {
  const seller = await sellerModel.findByUserId(userId);
  return seller ? toSellerProfileView(seller) : null;
}

export async function isStoreSlugAvailable(slug: string): Promise<boolean> {
  const taken = await sellerModel.findBySlug(slug);
  return !taken;
}

export async function getPublicStorefront(slug: string) {
  const seller = await SellerProfile.findOne({
    storeSlug: slug.trim().toLowerCase(),
    status: 'ACTIVE',
  }).lean();

  if (!seller) {
    throw AppError.notFound('Storefront not found or currently unavailable.');
  }

  const products = await Product.find({
    sellerId: seller._id,
    isActive: true,
    isApproved: true,
    sellerStatus: 'ACTIVE',
  })
    .sort({ createdAt: -1 })
    .lean();

  return {
    store: {
      id: String(seller._id),
      storeName: seller.storeName,
      storeSlug: seller.storeSlug,
      description: seller.description,
      logoUrl: seller.logoUrl,
      bannerUrl: seller.bannerUrl,
      ratingAverage: seller.ratingAverage,
      ratingCount: seller.ratingCount,
      servicePincodes: seller.servicePincodes,
      isVerified: seller.isVerified,
    },
    products: products.map(toProductView),
  };
}
