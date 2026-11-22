import { createHash, randomBytes } from 'node:crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import mongoose from 'mongoose';
import type { UserRole } from '@haat/shared-contracts';
import { env, isProd } from '../config/env';
import { RevokedToken } from '../models/RevokedToken';

const DURATION_PATTERN = /^(\d+)([smhd])$/;

/** Parses "15m", "7d", "3600s" into milliseconds. */
export function parseDurationMs(value: string): number {
  const match = DURATION_PATTERN.exec(value.trim());
  if (!match) throw new Error(`Invalid duration: ${value}`);
  const amount = Number(match[1]);
  const unit = match[2] as 's' | 'm' | 'h' | 'd';
  const multiplier = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit];
  return amount * multiplier;
}

export const REFRESH_TTL_MS = parseDurationMs(env.JWT_REFRESH_EXPIRES_IN);

export interface AccessTokenClaims {
  userId: string;
  role: UserRole;
}

/** Short-lived bearer token. Role is embedded so RBAC needs no extra query. */
export function signAccessToken(claims: AccessTokenClaims): string {
  return jwt.sign({ role: claims.role }, env.JWT_ACCESS_SECRET, {
    subject: claims.userId,
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions['expiresIn'],
    issuer: 'haat',
    audience: 'haat-web',
  });
}

export interface VerifiedAccessToken extends AccessTokenClaims {
  exp?: number;
}

export function verifyAccessToken(token: string): VerifiedAccessToken {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
  if (typeof decoded === 'string' || !decoded.sub) {
    throw new Error('Malformed access token');
  }
  return { userId: String(decoded.sub), role: decoded.role as UserRole, exp: decoded.exp };
}

/** Opaque refresh token — 384 bits of entropy, never a JWT. */
export function createRefreshToken(): { token: string; hash: string } {
  const token = randomBytes(48).toString('base64url');
  return { token, hash: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export const refreshCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: isProd,
  path: '/',
  maxAge: REFRESH_TTL_MS,
};

export function refreshCookieClearOptions(): { httpOnly: boolean; sameSite: 'lax'; secure: boolean; path: string } {
  return { httpOnly: true, sameSite: 'lax', secure: isProd, path: '/' };
}

/** Reads the refresh token, preferring body/client-explicit token over cross-port localhost cookie collision. */
export function readRefreshToken(cookies: Record<string, unknown>, body: unknown): string | null {
  if (typeof body === 'object' && body !== null && 'refreshToken' in body) {
    const value = (body as { refreshToken?: unknown }).refreshToken;
    if (typeof value === 'string' && value.length > 0) return value;
  }
  const fromCookie = cookies?.[env.REFRESH_COOKIE_NAME];
  if (typeof fromCookie === 'string' && fromCookie.length > 0) return fromCookie;
  return null;
}

/** Parses Bearer token from Authorization header string */
export function readBearerToken(header: string | undefined): string | null {
  if (!header) return null;
  const parts = header.trim().split(' ');
  if (parts.length === 2 && parts[0]?.toLowerCase() === 'bearer' && parts[1]) {
    return parts[1];
  }
  return null;
}

// In-memory set for instantaneous O(1) revocation checks in local process
const inMemoryRevokedTokens = new Set<string>();

/**
 * Revokes an access token immediately upon logout.
 * Saves the token hash to MongoDB with TTL so it's rejected across all services.
 */
export async function revokeAccessToken(token: string, userId?: string): Promise<void> {
  if (!token) return;
  try {
    const tokenHash = hashToken(token);
    inMemoryRevokedTokens.add(tokenHash);

    const decoded = jwt.decode(token) as { exp?: number; sub?: string } | null;
    const expiresAt = decoded?.exp
      ? new Date(decoded.exp * 1000)
      : new Date(Date.now() + 15 * 60 * 1000);
    const resolvedUserId = userId || (decoded?.sub ? String(decoded.sub) : undefined);

    if (mongoose.connection.readyState === 1) {
      await RevokedToken.findOneAndUpdate(
        { tokenHash },
        {
          tokenHash,
          userId: resolvedUserId,
          expiresAt,
        },
        { upsert: true, new: true },
      );
    }
  } catch {
    // Fail-safe: even if database write fails, in-memory cache retains revocation
  }
}

/**
 * Checks whether an access token has been revoked on logout.
 */
export async function isAccessTokenRevoked(token: string): Promise<boolean> {
  if (!token) return false;
  const tokenHash = hashToken(token);
  if (inMemoryRevokedTokens.has(tokenHash)) {
    return true;
  }
  if (mongoose.connection.readyState === 1) {
    try {
      const exists = await RevokedToken.exists({ tokenHash });
      if (exists) {
        inMemoryRevokedTokens.add(tokenHash);
        return true;
      }
    } catch {
      // If database connection is down, rely on in-memory set
    }
  }
  return false;
}
