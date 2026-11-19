import type { SellerStatus, UserRole } from '@haat/shared-contracts';

export interface PublicUser {
  id: string;
  fullName: string;
  phoneNumber: string;
  email: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: string | null;
  lastLoginAt: string | null;
}

export interface SellerProfile {
  id: string;
  storeName: string;
  storeSlug: string;
  storeAddress?: string | null;
  description: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  gstin: string;
  panNumber: string;
  bankAccountName: string;
  bankAccountNoMasked: string;
  bankIfscCode: string;
  servicePincodes: string[];
  status?: SellerStatus;
  isVerified: boolean;
  isActive: boolean;
  onboardingCompletedAt: string | null;
  createdAt: string | null;
}

export interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  path: string;
  depth: number;
  displayOrder: number;
  productCount: number;
  imageUrl?: string | null;
  imagePublicId?: string | null;
  children: CategoryNode[];
}

export interface ProductVariant {
  id: string;
  sku: string;
  title: string;
  priceModifierPaise: number;
  stockQuantity: number;
  attributes: Record<string, string>;
}

export interface ProductImage {
  id: string;
  url: string;
  publicId: string | null;
  altText: string | null;
  displayOrder: number;
  isPrimary: boolean;
}

export interface PricingTier {
  minQuantity: number;
  maxQuantity: number | null;
  unitPricePaise: number;
}

export type StockState = 'IN_STOCK' | 'LOW_STOCK' | 'SOLD_OUT';

export interface Product {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerSlug: string;
  categoryId: string;
  categoryPath: string;
  title: string;
  slug: string;
  description: string;
  sku: string;
  brand: string | null;
  totalPricePaise?: number;
  discountPercent?: number;
  retailPricePaise: number;
  categoryName?: string;
  effectiveUnitPricePaise: number;
  moq: number;
  orderMultiple: number;
  isWholesaleActive: boolean;
  hasWholesaleTiers: boolean;
  variants: ProductVariant[];
  images: ProductImage[];
  pricingTiers: PricingTier[];
  totalStock: number;
  stockState: StockState;
  ratingAverage: number;
  ratingCount: number;
  isActive: boolean;
  isApproved: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AuthPayload {
  user: PublicUser;
  accessToken: string;
  refreshToken?: string;
}

export interface MePayload {
  user: PublicUser;
  seller: SellerProfile | null;
}

export interface UploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  publicId?: string;
  signature: string;
  uploadUrl: string;
  uploadPreset?: string | null;
  allowedFormats: string[];
  maxFileSizeBytes: number;
}
