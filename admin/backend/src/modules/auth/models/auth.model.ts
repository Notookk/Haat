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
    if (!trimmed) return null;

    if (trimmed.toLowerCase() === 'admin') {
      return User.findOne({
        $or: [{ email: 'admin@haat.com' }, { role: 'ADMIN' }, { role: 'SUPER_ADMIN' }],
      }).select('+passwordHash').lean();
    }

    if (trimmed.includes('@')) {
      return User.findOne({ email: trimmed.toLowerCase() }).select('+passwordHash').lean();
    }

    // Normalize phone number (handle country code +91 or non-digit chars)
    const digitsOnly = trimmed.replace(/\D/g, '');
    const phone10 = digitsOnly.length === 12 && digitsOnly.startsWith('91')
      ? digitsOnly.slice(2)
      : digitsOnly.length > 10
        ? digitsOnly.slice(-10)
        : digitsOnly;

    return User.findOne({
      $or: [{ phoneNumber: trimmed }, { phoneNumber: phone10 }],
    }).select('+passwordHash').lean();
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
