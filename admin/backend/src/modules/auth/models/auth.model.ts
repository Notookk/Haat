import { User, RefreshToken } from '@haat/shared-backend';

export interface CreateAdminRefreshTokenData {
  userId: unknown;
  tokenHash: string;
  expiresAt: Date;
  userAgent?: string | null;
  ipAddress?: string | null;
}

export const adminAuthModel = {
  async findAdminForLogin(identifier: string) {
    const trimmed = identifier.trim();
    const isEmail = trimmed.includes('@');
    const filter = isEmail ? { email: trimmed.toLowerCase() } : { phoneNumber: trimmed };

    return User.findOne(filter).select('+passwordHash').lean();
  },

  async findAdminById(id: string) {
    return User.findById(id).lean();
  },

  async createRefreshToken(data: CreateAdminRefreshTokenData) {
    return RefreshToken.create(data);
  },

  async findRefreshToken(tokenHash: string) {
    return RefreshToken.findOne({ tokenHash });
  },

  async findRefreshTokenByHash(tokenHash: string) {
    return RefreshToken.findOne({ tokenHash });
  },

  async revokeRefreshToken(tokenHash: string) {
    return RefreshToken.updateOne({ tokenHash }, { $set: { revokedAt: new Date() } });
  },

  async revokeUserRefreshTokens(userId: unknown) {
    return RefreshToken.updateMany({ userId, revokedAt: null }, { $set: { revokedAt: new Date() } });
  },
};
