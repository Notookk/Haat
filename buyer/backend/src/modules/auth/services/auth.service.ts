import { ERROR_CODES, type LoginInput, type RegisterInput } from '@haat/shared-contracts';
import {
  AppError,
  hashPassword,
  verifyPassword,
  signAccessToken,
  createRefreshToken,
  hashToken,
  REFRESH_TTL_MS,
} from '@haat/shared-backend';
import { toPublicUser, type PublicUser, type SellerSummary } from '../auth.dto';
import { authModel } from '../models/auth.model';

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

async function issueSession(user: { _id: unknown; role: PublicUser['role'] }, meta: RequestMeta): Promise<AuthSession> {
  const accessToken = signAccessToken({ userId: String(user._id), role: user.role });
  const { token, hash } = createRefreshToken();

  await authModel.createRefreshToken({
    userId: user._id,
    tokenHash: hash,
    expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
    userAgent: meta.userAgent?.slice(0, 300) ?? null,
    ipAddress: meta.ipAddress?.slice(0, 64) ?? null,
  });

  return { user: toPublicUser(user as Parameters<typeof toPublicUser>[0]), accessToken, refreshToken: token };
}

export async function register(input: RegisterInput, meta: RequestMeta): Promise<AuthSession> {
  const phoneNumber = normalizePhone(input.phoneNumber);

  const existingPhone = await authModel.findUserByPhone(phoneNumber);
  if (existingPhone) {
    throw AppError.conflict('An account with this phone number already exists.', ERROR_CODES.DUPLICATE_KEY);
  }

  if (input.email) {
    const existingEmail = await authModel.findUserByEmail(input.email);
    if (existingEmail) {
      throw AppError.conflict('An account with this email already exists.', ERROR_CODES.DUPLICATE_KEY);
    }
  }

  const passwordHash = await hashPassword(input.password);

  const user = await authModel.createUser({
    fullName: input.fullName,
    phoneNumber,
    email: input.email ?? null,
    passwordHash,
    role: input.role,
  });

  // Buyers get their profile shell immediately so later modules never need an upsert race.
  await authModel.createBuyerProfile(user._id);

  return issueSession(user, meta);
}

export async function login(input: LoginInput, meta: RequestMeta): Promise<AuthSession> {
  const identifier = input.identifier.trim();
  const isEmail = identifier.includes('@');

  const normalizedIdentifier = isEmail ? identifier.toLowerCase() : normalizePhone(identifier);
  const user = await authModel.findUserForLogin(normalizedIdentifier);

  const invalid = AppError.unauthorized('Phone number or password is incorrect.', ERROR_CODES.INVALID_CREDENTIALS);
  if (!user || !user.passwordHash) throw invalid;

  const matches = await verifyPassword(input.password, user.passwordHash);
  if (!matches) throw invalid;

  if (!user.isActive) {
    throw AppError.forbidden('This account has been suspended. Contact support if you believe this is a mistake.');
  }

  await authModel.updateLastLogin(user._id);

  return issueSession(user, meta);
}

export async function refresh(rawToken: string | null, meta: RequestMeta): Promise<AuthSession> {
  if (!rawToken) {
    throw AppError.unauthorized('Your session has ended. Sign in again.', ERROR_CODES.TOKEN_INVALID);
  }

  const tokenHash = hashToken(rawToken);
  const record = await authModel.findRefreshTokenByHash(tokenHash);

  if (!record) {
    throw AppError.unauthorized('Your session has ended. Sign in again.', ERROR_CODES.TOKEN_INVALID);
  }

  if (record.revokedAt) {
    await authModel.revokeAllUserTokens(record.userId);
    throw AppError.unauthorized('Your session was used from another device. Sign in again.', ERROR_CODES.TOKEN_INVALID);
  }

  if (record.expiresAt.getTime() <= Date.now()) {
    throw AppError.unauthorized('Your session has expired. Sign in again.', ERROR_CODES.TOKEN_EXPIRED);
  }

  const user = await authModel.findUserById(String(record.userId));
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
  const tokenHash = hashToken(rawToken);
  const record = await authModel.findRefreshTokenByHash(tokenHash);
  if (record && !record.revokedAt) {
    await authModel.revokeRefreshToken(record._id);
  }
}

export interface MePayload {
  user: PublicUser;
  seller: SellerSummary | null;
}

export async function getMe(userId: string): Promise<MePayload> {
  const user = await authModel.findUserById(userId);
  if (!user || !user.isActive) {
    throw AppError.unauthorized('This account is no longer active.');
  }

  const seller = await authModel.findSellerByUserId(String(user._id));

  return {
    user: toPublicUser(user),
    seller: seller
      ? {
          id: String(seller._id),
          storeName: seller.storeName,
          storeSlug: seller.storeSlug,
          isVerified: seller.isVerified,
        }
      : null,
  };
}
