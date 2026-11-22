import { ERROR_CODES, type UserRole } from '@haat/shared-contracts';
import {
  AppError,
  verifyPassword,
  signAccessToken,
  createRefreshToken,
  hashToken,
  REFRESH_TTL_MS,
} from '@haat/shared-backend';
import { adminAuthModel } from '../models/auth.model';
import type { AdminLoginInput } from '../validators/auth.validator';
import { bootstrapAdminUser } from './bootstrap.service';

export interface AdminSession {
  user: {
    id: string;
    fullName: string;
    phoneNumber: string;
    email: string | null;
    role: UserRole;
  };
  accessToken: string;
  refreshToken: string;
}

export interface RequestMeta {
  userAgent?: string;
  ipAddress?: string;
}

export const adminAuthService = {
  async login(input: AdminLoginInput, meta: RequestMeta): Promise<AdminSession> {
    let admin = await adminAuthModel.findAdminForLogin(input.identifier.trim());

    // If no admin user found in MongoDB, ensure dynamic bootstrap runs and retry
    if (!admin) {
      await bootstrapAdminUser();
      admin = await adminAuthModel.findAdminForLogin(input.identifier.trim());
    }

    if (!admin || !admin.passwordHash) {
      throw new AppError(ERROR_CODES.INVALID_CREDENTIALS, 'Invalid email/phone or password.', 401);
    }

    if (!admin.isActive) {
      throw new AppError(ERROR_CODES.FORBIDDEN, 'Admin account has been deactivated.', 403);
    }

    if (admin.role !== 'ADMIN' && admin.role !== 'SUPER_ADMIN') {
      throw new AppError(ERROR_CODES.UNAUTHORIZED, 'Access restricted to platform administrators.', 401);
    }

    const isValid = await verifyPassword(input.password, admin.passwordHash);
    if (!isValid) {
      throw new AppError(ERROR_CODES.INVALID_CREDENTIALS, 'Invalid email/phone or password.', 401);
    }

    const accessToken = signAccessToken({ userId: String(admin._id), role: admin.role as UserRole });
    const { token: rawRefreshToken, hash: tokenHash } = createRefreshToken();

    await adminAuthModel.createRefreshToken({
      userId: admin._id,
      tokenHash,
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      userAgent: meta.userAgent ?? null,
      ipAddress: meta.ipAddress ?? null,
    });

    return {
      user: {
        id: String(admin._id),
        fullName: admin.fullName,
        phoneNumber: admin.phoneNumber,
        email: admin.email ?? null,
        role: admin.role as UserRole,
      },
      accessToken,
      refreshToken: rawRefreshToken,
    };
  },

  async refresh(rawToken: string | null | undefined, meta: RequestMeta): Promise<AdminSession> {
    if (!rawToken) {
      throw new AppError(ERROR_CODES.TOKEN_INVALID, 'Your session has ended. Sign in again.', 401);
    }

    const tokenHash = hashToken(rawToken);
    const record = await adminAuthModel.findRefreshTokenByHash(tokenHash);

    if (!record) {
      throw new AppError(ERROR_CODES.TOKEN_INVALID, 'Your session has ended. Sign in again.', 401);
    }

    if (record.revokedAt) {
      await adminAuthModel.revokeUserRefreshTokens(record.userId);
      throw new AppError(ERROR_CODES.TOKEN_INVALID, 'Your session was used from another device. Sign in again.', 401);
    }

    if (record.expiresAt.getTime() <= Date.now()) {
      throw new AppError(ERROR_CODES.TOKEN_EXPIRED, 'Your session has expired. Sign in again.', 401);
    }

    const admin = await adminAuthModel.findAdminById(String(record.userId));
    if (!admin || !admin.isActive) {
      throw new AppError(ERROR_CODES.TOKEN_INVALID, 'This account is no longer active.', 401);
    }

    if (admin.role !== 'ADMIN' && admin.role !== 'SUPER_ADMIN') {
      throw new AppError(ERROR_CODES.UNAUTHORIZED, 'Access restricted to platform administrators.', 401);
    }

    const accessToken = signAccessToken({ userId: String(admin._id), role: admin.role as UserRole });
    const { token: nextRawRefreshToken, hash: nextTokenHash } = createRefreshToken();

    // Revoke old token and set replacedByHash
    record.revokedAt = new Date();
    record.replacedByHash = nextTokenHash;
    await record.save();

    // Persist new refresh token in session rotation
    await adminAuthModel.createRefreshToken({
      userId: admin._id,
      tokenHash: nextTokenHash,
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      userAgent: meta.userAgent ?? null,
      ipAddress: meta.ipAddress ?? null,
    });

    return {
      user: {
        id: String(admin._id),
        fullName: admin.fullName,
        phoneNumber: admin.phoneNumber,
        email: admin.email ?? null,
        role: admin.role as UserRole,
      },
      accessToken,
      refreshToken: nextRawRefreshToken,
    };
  },

  async me(adminId: string) {
    const admin = await adminAuthModel.findAdminById(adminId);
    if (!admin) {
      throw new AppError(ERROR_CODES.NOT_FOUND, 'Admin user not found.', 404);
    }
    return {
      id: String(admin._id),
      fullName: admin.fullName,
      phoneNumber: admin.phoneNumber,
      email: admin.email ?? null,
      role: admin.role as UserRole,
    };
  },

  async logout(refreshToken?: string) {
    if (refreshToken) {
      const tokenHash = hashToken(refreshToken);
      await adminAuthModel.revokeRefreshToken(tokenHash);
    }
  },
};
