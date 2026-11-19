export interface SellerProfileView {
  id: string;
  storeName: string;
  storeSlug: string;
  description: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  gstin: string;
  panNumber: string;
  bankAccountName: string;
  bankAccountNoMasked: string;
  bankIfscCode: string;
  servicePincodes: string[];
  isVerified: boolean;
  isActive: boolean;
  onboardingCompletedAt: string | null;
  createdAt: string | null;
}

interface SellerLike {
  _id: unknown;
  storeName: string;
  storeSlug: string;
  description?: string | null;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  gstin: string;
  panNumber: string;
  bankAccountName: string;
  bankAccountNo: string;
  bankIfscCode: string;
  servicePincodes: string[];
  isVerified: boolean;
  isActive: boolean;
  onboardingCompletedAt?: Date | null;
  createdAt?: Date | null;
}

export function maskAccountNumber(accountNo: string): string {
  if (accountNo.length <= 4) return '••••';
  return `${'•'.repeat(Math.max(0, accountNo.length - 4))}${accountNo.slice(-4)}`;
}

export function toSellerProfileView(seller: SellerLike): SellerProfileView {
  return {
    id: String(seller._id),
    storeName: seller.storeName,
    storeSlug: seller.storeSlug,
    description: seller.description ?? null,
    logoUrl: seller.logoUrl ?? null,
    bannerUrl: seller.bannerUrl ?? null,
    gstin: seller.gstin,
    panNumber: seller.panNumber,
    bankAccountName: seller.bankAccountName,
    bankAccountNoMasked: maskAccountNumber(seller.bankAccountNo),
    bankIfscCode: seller.bankIfscCode,
    servicePincodes: seller.servicePincodes,
    isVerified: seller.isVerified,
    isActive: seller.isActive,
    onboardingCompletedAt: seller.onboardingCompletedAt ? new Date(seller.onboardingCompletedAt).toISOString() : null,
    createdAt: seller.createdAt ? new Date(seller.createdAt).toISOString() : null,
  };
}
