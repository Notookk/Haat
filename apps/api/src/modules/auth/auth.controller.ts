import type { Request } from 'express';
import type { LoginInput, RegisterInput } from '@haat/shared';
import { env } from '../../config/env';
import { asyncHandler } from '../../lib/asyncHandler';
import { HttpStatus, sendSuccess } from '../../lib/http';
import { AppError } from '../../lib/AppError';
import { readRefreshToken, refreshCookieClearOptions, refreshCookieOptions } from '../../utils/tokens';
import { getMe, login, logout, refresh, register, type RequestMeta } from './auth.service';

function metaFrom(req: Request): RequestMeta {
  return {
    userAgent: req.header('user-agent') ?? undefined,
    ipAddress: req.ip ?? undefined,
  };
}

export const registerHandler = asyncHandler(async (req, res) => {
  const session = await register(req.body as RegisterInput, metaFrom(req));
  res.cookie(env.REFRESH_COOKIE_NAME, session.refreshToken, refreshCookieOptions);
  return sendSuccess(res, { user: session.user, accessToken: session.accessToken }, HttpStatus.CREATED);
});

export const loginHandler = asyncHandler(async (req, res) => {
  const session = await login(req.body as LoginInput, metaFrom(req));
  res.cookie(env.REFRESH_COOKIE_NAME, session.refreshToken, refreshCookieOptions);
  return sendSuccess(res, { user: session.user, accessToken: session.accessToken });
});

export const refreshHandler = asyncHandler(async (req, res) => {
  const rawToken = readRefreshToken(req.cookies ?? {}, req.body);
  const session = await refresh(rawToken, metaFrom(req));
  res.cookie(env.REFRESH_COOKIE_NAME, session.refreshToken, refreshCookieOptions);
  return sendSuccess(res, { user: session.user, accessToken: session.accessToken });
});

export const logoutHandler = asyncHandler(async (req, res) => {
  const rawToken = readRefreshToken(req.cookies ?? {}, req.body);
  await logout(rawToken);
  res.clearCookie(env.REFRESH_COOKIE_NAME, refreshCookieClearOptions());
  return sendSuccess(res, { loggedOut: true });
});

export const meHandler = asyncHandler(async (req, res) => {
  if (!req.user) throw AppError.unauthorized('Sign in to continue.');
  const payload = await getMe(req.user.id);
  return sendSuccess(res, payload);
});
