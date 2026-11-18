import { createHash, randomBytes } from 'node:crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import type { UserRole } from '@haat/shared';
import { env, isProd } from '../config/env';

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
  path: '/api/v1/auth',
  maxAge: REFRESH_TTL_MS,
};

export function refreshCookieClearOptions(): { httpOnly: boolean; sameSite: 'lax'; secure: boolean; path: string } {
  return { httpOnly: true, sameSite: 'lax', secure: isProd, path: '/api/v1/auth' };
}

/** Reads the refresh token from the cookie, falling back to a body value for native clients. */
export function readRefreshToken(cookies: Record<string, unknown>, body: unknown): string | null {
  const fromCookie = cookies?.[env.REFRESH_COOKIE_NAME];
  if (typeof fromCookie === 'string' && fromCookie.length > 0) return fromCookie;
  if (typeof body === 'object' && body !== null && 'refreshToken' in body) {
    const value = (body as { refreshToken?: unknown }).refreshToken;
    if (typeof value === 'string' && value.length > 0) return value;
  }
  return null;
}
