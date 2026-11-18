import { ERROR_CODES, type LoginInput, type RegisterInput, type KycStatus } from '@haat/shared';
import { AppError } from '../../lib/AppError';
import { BuyerProfile, RefreshToken, SellerProfile, User } from '../../models';
import { hashPassword, verifyPassword } from '../../utils/password';
import { REFRESH_TTL_MS, createRefreshToken, hashToken, signAccessToken } from '../../utils/tokens';
import { toPublicUser, type PublicUser, type SellerSummary } from './auth.dto';

export interface RequestMeta {
  userAgent?: string;
  ipAddress?: string;
}

export interface AuthSession {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
}

/** Accepts "+91 98765 43210" and returns "9876543210". */
export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  return digits.length > 10 ? digits.slice(-10) : digits;
}

async function issueSession(
  user: { _id: unknown; role: PublicUser['role'] },
  meta: RequestMeta,
): Promise<AuthSession> {
  const accessToken = signAccessToken({ userId: String(user._id), role: user.role });
  const { token, hash } = createRefreshToken();

  await RefreshToken.create({
    userId: user._id,
    tokenHash: hash,
    expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
    revokedAt: null,
    userAgent: meta.userAgent?.slice(0, 300) ?? null,
    ipAddress: meta.ipAddress?.slice(0, 64) ?? null,
  });

  return { user: toPublicUser(user as Parameters<typeof toPublicUser>[0]), accessToken, refreshToken: token };
}

export async function register(input: RegisterInput, meta: RequestMeta): Promise<AuthSession> {
  const phoneNumber = normalizePhone(input.phoneNumber);

  const existingPhone = await User.findOne({ phoneNumber }).select('_id').lean();
  if (existingPhone) {
    throw AppError.conflict('An account with this phone number already exists.', ERROR_CODES.DUPLICATE_KEY);
  }

  if (input.email) {
    const existingEmail = await User.findOne({ email: input.email }).select('_id').lean();
    if (existingEmail) {
      throw AppError.conflict('An account with this email already exists.', ERROR_CODES.DUPLICATE_KEY);
    }
  }

  const passwordHash = await hashPassword(input.password);

  const user = await User.create({
    fullName: input.fullName,
    phoneNumber,
    email: input.email ?? null,
    passwordHash,
    role: input.role,
    isActive: true,
  });

  // Buyers get their profile shell immediately so later modules never need an upsert race.
  await BuyerProfile.updateOne(
    { userId: user._id },
    { $setOnInsert: { userId: user._id, isVerifiedBusiness: false } },
    { upsert: true },
  );

  return issueSession(user, meta);
}

export async function login(input: LoginInput, meta: RequestMeta): Promise<AuthSession> {
  const identifier = input.identifier.trim();
  const isEmail = identifier.includes('@');

  const user = isEmail
    ? await User.findOne({ email: identifier.toLowerCase() }).select('+passwordHash')
    : await User.findOne({ phoneNumber: normalizePhone(identifier) }).select('+passwordHash');

  const invalid = AppError.unauthorized('Phone number or password is incorrect.', ERROR_CODES.INVALID_CREDENTIALS);
  if (!user || !user.passwordHash) throw invalid;

  const matches = await verifyPassword(input.password, user.passwordHash);
  if (!matches) throw invalid;

  if (!user.isActive) {
    throw AppError.forbidden('This account has been suspended. Contact support if you believe this is a mistake.');
  }

  user.lastLoginAt = new Date();
  await user.save();

  return issueSession(user, meta);
}

export async function refresh(rawToken: string | null, meta: RequestMeta): Promise<AuthSession> {
  if (!rawToken) {
    throw AppError.unauthorized('Your session has ended. Sign in again.', ERROR_CODES.TOKEN_INVALID);
  }

  const tokenHash = hashToken(rawToken);
  const record = await RefreshToken.findOne({ tokenHash });

  if (!record) {
    throw AppError.unauthorized('Your session has ended. Sign in again.', ERROR_CODES.TOKEN_INVALID);
  }

  if (record.revokedAt) {
    // Replay of a rotated token: assume theft and end every session for that user.
    await RefreshToken.updateMany(
      { userId: record.userId, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );
    throw AppError.unauthorized('Your session was used from another device. Sign in again.', ERROR_CODES.TOKEN_INVALID);
  }

  if (record.expiresAt.getTime() <= Date.now()) {
    throw AppError.unauthorized('Your session has expired. Sign in again.', ERROR_CODES.TOKEN_EXPIRED);
  }

  const user = await User.findById(record.userId);
  if (!user || !user.isActive) {
    throw AppError.unauthorized('This account is no longer active.', ERROR_CODES.TOKEN_INVALID);
  }

  const session = await issueSession(user, meta);

  record.revokedAt = new Date();
  record.replacedByHash = hashToken(session.refreshToken);
  await record.save();

  return session;
}

export async function logout(rawToken: string | null): Promise<void> {
  if (!rawToken) return;
  await RefreshToken.updateOne(
    { tokenHash: hashToken(rawToken), revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );
}

export interface MePayload {
  user: PublicUser;
  seller: SellerSummary | null;
}

export async function getMe(userId: string): Promise<MePayload> {
  const user = await User.findById(userId);
  if (!user || !user.isActive) {
    throw AppError.unauthorized('This account is no longer active.');
  }

  const seller = await SellerProfile.findOne({ userId: user._id }).lean();

  return {
    user: toPublicUser(user),
    seller: seller
      ? {
          id: String(seller._id),
          storeName: seller.storeName,
          storeSlug: seller.storeSlug,
          kycStatus: seller.kycStatus as KycStatus,
          isVerified: seller.isVerified,
        }
      : null,
  };
}
