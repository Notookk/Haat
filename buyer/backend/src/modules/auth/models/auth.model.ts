import { BuyerProfile, RefreshToken, SellerProfile, User } from '@haat/shared-backend';
import type { UserRole } from '@haat/shared-contracts';

export interface CreateUserData {
  fullName: string;
  phoneNumber: string;
  email?: string | null;
  role: UserRole;
  passwordHash: string;
}

export interface CreateRefreshTokenData {
  userId: unknown;
  tokenHash: string;
  expiresAt: Date;
  userAgent?: string | null;
  ipAddress?: string | null;
}

export const authModel = {
  async findUserByPhone(phoneNumber: string) {
    return User.findOne({ phoneNumber }).select('_id').lean();
  },

  async findUserByEmail(email: string) {
    return User.findOne({ email }).select('_id').lean();
  },

  async findUserForLogin(identifier: string) {
    return User.findOne({
      $or: [{ phoneNumber: identifier }, { email: identifier }],
    })
      .select('+passwordHash')
      .lean();
  },

  async findUserById(id: string) {
    return User.findById(id).lean();
  },

  async createUser(data: CreateUserData) {
    return User.create({
      fullName: data.fullName,
      phoneNumber: data.phoneNumber,
      email: data.email ?? null,
      role: data.role,
      passwordHash: data.passwordHash,
      isActive: true,
    });
  },

  async createBuyerProfile(userId: unknown) {
    return BuyerProfile.create({ userId });
  },

  async createSellerProfile(data: {
    userId: unknown;
    storeName: string;
    storeSlug: string;
    servicePincodes: string[];
  }) {
    return SellerProfile.create({
      userId: data.userId,
      storeName: data.storeName,
      storeSlug: data.storeSlug,
      servicePincodes: data.servicePincodes,
      isVerified: false,
      isActive: true,
    });
  },

  async createRefreshToken(data: CreateRefreshTokenData) {
    return RefreshToken.create({
      userId: data.userId,
      tokenHash: data.tokenHash,
      expiresAt: data.expiresAt,
      revokedAt: null,
      userAgent: data.userAgent ?? null,
      ipAddress: data.ipAddress ?? null,
    });
  },

  async findRefreshTokenByHash(tokenHash: string) {
    return RefreshToken.findOne({ tokenHash });
  },

  async revokeRefreshToken(id: unknown) {
    return RefreshToken.updateOne({ _id: id }, { $set: { revokedAt: new Date() } });
  },

  async revokeAllUserTokens(userId: unknown) {
    return RefreshToken.updateMany({ userId, revokedAt: null }, { $set: { revokedAt: new Date() } });
  },

  async updateLastLogin(userId: unknown) {
    return User.updateOne({ _id: userId }, { $set: { lastLoginAt: new Date() } });
  },

  async findSellerByUserId(userId: string) {
    return SellerProfile.findOne({ userId }).lean();
  },
};
