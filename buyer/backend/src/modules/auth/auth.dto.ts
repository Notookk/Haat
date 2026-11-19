import type { UserRole } from '@haat/shared-contracts';

/** User shape shared with the browser. Never includes passwordHash or internal fields. */
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

export interface SellerSummary {
  id: string;
  storeName: string;
  storeSlug: string;
  isVerified: boolean;
}

interface UserLike {
  _id: unknown;
  fullName: string;
  phoneNumber: string;
  email?: string | null;
  role: UserRole;
  isActive?: boolean;
  createdAt?: Date | null;
  lastLoginAt?: Date | null;
}

export function toPublicUser(user: UserLike): PublicUser {
  return {
    id: String(user._id),
    fullName: user.fullName,
    phoneNumber: user.phoneNumber,
    email: user.email ?? null,
    role: user.role,
    isActive: user.isActive ?? true,
    createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : null,
    lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt).toISOString() : null,
  };
}
