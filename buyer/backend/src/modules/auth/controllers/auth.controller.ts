import type { Request } from 'express';
import type { LoginInput, RegisterInput } from '@haat/shared-contracts';
import {
  AppError,
  asyncHandler,
  HttpStatus,
  sendSuccess,
  env,
  readRefreshToken,
  readBearerToken,
  revokeAccessToken,
  refreshCookieClearOptions,
  refreshCookieOptions,
} from '@haat/shared-backend';
import { getMe, login, logout, refresh, register, type RequestMeta } from '../services/auth.service';

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
  const bearerToken = readBearerToken(req.header('authorization')) || req.body?.accessToken;
  if (bearerToken) {
    await revokeAccessToken(bearerToken);
  }
  await logout(rawToken);
  res.clearCookie(env.REFRESH_COOKIE_NAME, refreshCookieClearOptions());
  return sendSuccess(res, { loggedOut: true });
});

export const meHandler = asyncHandler(async (req, res) => {
  if (!req.user) throw AppError.unauthorized('Sign in to continue.');
  const payload = await getMe(req.user.id);
  return sendSuccess(res, payload);
});
