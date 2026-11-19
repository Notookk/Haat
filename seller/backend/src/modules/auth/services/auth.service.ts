import { ERROR_CODES, type UserRole } from '@haat/shared-contracts';
import {
  AppError,
  User,
  SellerProfile,
  RefreshToken,
  verifyPassword,
  hashPassword,
  signAccessToken,
  createRefreshToken,
  hashToken,
  REFRESH_TTL_MS,
} from '@haat/shared-backend';
import type { SellerLoginInput, SellerRegisterInput } from '../validators/auth.validator';

export interface SellerSessionUser {
  id: string;
  fullName: string;
  phoneNumber: string;
  email: string | null;
  role: UserRole;
}

export interface SellerSessionProfile {
  id: string;
  storeName: string;
  storeSlug: string;
  storeAddress?: string | null;
  status: 'PENDING_APPROVAL' | 'ACTIVE' | 'REJECTED' | 'BLOCKED';
  statusReason?: string | null;
  blockedReason?: string | null;
  approvalNotes?: string | null;
  isVerified: boolean;
  isActive: boolean;
  description?: string | null;
  gstin?: string;
  panNumber?: string;
  bankAccountName?: string;
  bankAccountNo?: string;
  bankIfscCode?: string;
  servicePincodes?: string[];
  createdAt?: string;
}

export function formatSellerSessionProfile(sellerProfile: any): SellerSessionProfile | null {
  if (!sellerProfile) return null;
  return {
    id: sellerProfile._id.toString(),
    storeName: sellerProfile.storeName,
    storeSlug: sellerProfile.storeSlug,
    storeAddress: sellerProfile.storeAddress ?? null,
    status: sellerProfile.status || (sellerProfile.isActive ? 'ACTIVE' : 'PENDING_APPROVAL'),
    statusReason: sellerProfile.statusReason ?? null,
    blockedReason: sellerProfile.blockedReason ?? null,
    approvalNotes: sellerProfile.approvalNotes ?? null,
    isVerified: sellerProfile.isVerified,
    isActive: sellerProfile.isActive,
    description: sellerProfile.description ?? null,
    gstin: sellerProfile.gstin,
    panNumber: sellerProfile.panNumber,
    bankAccountName: sellerProfile.bankAccountName,
    bankAccountNo: sellerProfile.bankAccountNo,
    bankIfscCode: sellerProfile.bankIfscCode,
    servicePincodes: sellerProfile.servicePincodes,
    createdAt: sellerProfile.createdAt ? new Date(sellerProfile.createdAt).toISOString() : undefined,
  };
}

export interface SellerSession {
  user: SellerSessionUser;
  seller: SellerSessionProfile | null;
  accessToken: string;
  refreshToken: string;
}

export interface RequestMeta {
  userAgent?: string;
  ipAddress?: string;
}

export const sellerAuthService = {
  async login(input: SellerLoginInput, meta: RequestMeta): Promise<SellerSession> {
    const isEmail = input.identifier.includes('@');
    const query = isEmail ? { email: input.identifier.trim().toLowerCase() } : { phoneNumber: input.identifier.trim() };

    const user = await User.findOne(query).select('+passwordHash');
    if (!user || !user.passwordHash) {
      throw new AppError(ERROR_CODES.INVALID_CREDENTIALS, 'Invalid email/phone or password.', 401);
    }

    if (!user.isActive) {
      throw new AppError(ERROR_CODES.FORBIDDEN, 'Your account has been deactivated. Contact support.', 403);
    }

    if (user.role !== 'SELLER' && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      throw new AppError(
        ERROR_CODES.FORBIDDEN,
        'Access denied. This portal is exclusively for verified marketplace sellers.',
        403,
      );
    }

    const isValid = await verifyPassword(input.password, user.passwordHash);
    if (!isValid) {
      throw new AppError(ERROR_CODES.INVALID_CREDENTIALS, 'Invalid email/phone or password.', 401);
    }

    const sellerProfile = await SellerProfile.findOne({ userId: user._id });

    const { token: rawRefreshToken, hash: tokenHash } = createRefreshToken();
    const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);

    await RefreshToken.create({
      userId: user._id,
      tokenHash,
      userAgent: meta.userAgent ?? null,
      ipAddress: meta.ipAddress ?? null,
      expiresAt,
    });

    const accessToken = signAccessToken({
      userId: user._id.toString(),
      role: user.role,
    });

    return {
      user: {
        id: user._id.toString(),
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        email: user.email ?? null,
        role: user.role,
      },
      seller: formatSellerSessionProfile(sellerProfile),
      accessToken,
      refreshToken: rawRefreshToken,
    };
  },

  async register(input: SellerRegisterInput, meta: RequestMeta): Promise<SellerSession> {
    const existingPhone = await User.findOne({ phoneNumber: input.phoneNumber });
    if (existingPhone) {
      throw new AppError(ERROR_CODES.CONFLICT, 'An account with this phone number already exists.', 409);
    }

    const existingEmail = await User.findOne({ email: input.email.trim().toLowerCase() });
    if (existingEmail) {
      throw new AppError(ERROR_CODES.CONFLICT, 'An account with this email address already exists.', 409);
    }

    const passwordHash = await hashPassword(input.password);
    const user = await User.create({
      fullName: input.fullName.trim(),
      phoneNumber: input.phoneNumber.trim(),
      email: input.email.trim().toLowerCase(),
      passwordHash,
      role: 'SELLER',
      isPhoneVerified: true,
      isActive: true,
    });

    const { token: rawRefreshToken, hash: tokenHash } = createRefreshToken();
    const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);

    await RefreshToken.create({
      userId: user._id,
      tokenHash,
      userAgent: meta.userAgent ?? null,
      ipAddress: meta.ipAddress ?? null,
      expiresAt,
    });

    const accessToken = signAccessToken({
      userId: user._id.toString(),
      role: 'SELLER',
    });

    return {
      user: {
        id: user._id.toString(),
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        email: user.email ?? null,
        role: 'SELLER',
      },
      seller: null,
      accessToken,
      refreshToken: rawRefreshToken,
    };
  },

  async refresh(rawToken: string, meta: RequestMeta): Promise<SellerSession> {
    if (!rawToken) {
      throw new AppError(ERROR_CODES.UNAUTHORIZED, 'Session expired. Please sign in again.', 401);
    }

    const hashed = hashToken(rawToken);
    const existing = await RefreshToken.findOne({ tokenHash: hashed });

    if (!existing || existing.revokedAt !== null || existing.expiresAt < new Date()) {
      throw new AppError(ERROR_CODES.UNAUTHORIZED, 'Invalid or expired session token.', 401);
    }

    const { token: newRawRefreshToken, hash: newTokenHash } = createRefreshToken();
    existing.revokedAt = new Date();
    existing.replacedByHash = newTokenHash;
    await existing.save();

    const user = await User.findById(existing.userId);
    if (!user || !user.isActive) {
      throw new AppError(ERROR_CODES.FORBIDDEN, 'Account is inactive.', 403);
    }

    const sellerProfile = await SellerProfile.findOne({ userId: user._id });

    const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);
    await RefreshToken.create({
      userId: user._id,
      tokenHash: newTokenHash,
      userAgent: meta.userAgent ?? null,
      ipAddress: meta.ipAddress ?? null,
      expiresAt,
    });

    const accessToken = signAccessToken({
      userId: user._id.toString(),
      role: user.role,
    });

    return {
      user: {
        id: user._id.toString(),
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        email: user.email ?? null,
        role: user.role,
      },
      seller: formatSellerSessionProfile(sellerProfile),
      accessToken,
      refreshToken: newRawRefreshToken,
    };
  },

  async logout(rawToken?: string): Promise<void> {
    if (rawToken) {
      const hashed = hashToken(rawToken);
      await RefreshToken.updateOne({ tokenHash: hashed }, { revokedAt: new Date() });
    }
  },

  async changePassword(userId: string, currentPass: string, newPass: string): Promise<void> {
    const user = await User.findById(userId);
    if (!user) throw AppError.notFound('User not found.');
    const valid = await verifyPassword(currentPass, user.passwordHash);
    if (!valid) throw AppError.badRequest('Current password is incorrect.');
    user.passwordHash = await hashPassword(newPass);
    await user.save();
  },
};
