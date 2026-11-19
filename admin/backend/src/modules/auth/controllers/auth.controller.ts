import type { Request } from 'express';
import {
  asyncHandler,
  sendSuccess,
  env,
  readRefreshToken,
  readBearerToken,
  revokeAccessToken,
  refreshCookieClearOptions,
  refreshCookieOptions,
} from '@haat/shared-backend';
import { adminAuthService, type RequestMeta } from '../services/auth.service';
import type { AdminLoginInput } from '../validators/auth.validator';

function metaFrom(req: Request): RequestMeta {
  return {
    userAgent: req.header('user-agent') ?? undefined,
    ipAddress: req.ip ?? undefined,
  };
}

export const adminLoginHandler = asyncHandler(async (req, res) => {
  const session = await adminAuthService.login(req.body as AdminLoginInput, metaFrom(req));
  res.cookie(env.REFRESH_COOKIE_NAME, session.refreshToken, refreshCookieOptions);
  return sendSuccess(res, { user: session.user, accessToken: session.accessToken, refreshToken: session.refreshToken });
});

export const adminRefreshHandler = asyncHandler(async (req, res) => {
  const rawToken = readRefreshToken(req.cookies ?? {}, req.body);
  const session = await adminAuthService.refresh(rawToken, metaFrom(req));
  res.cookie(env.REFRESH_COOKIE_NAME, session.refreshToken, refreshCookieOptions);
  return sendSuccess(res, { user: session.user, accessToken: session.accessToken, refreshToken: session.refreshToken });
});

export const adminMeHandler = asyncHandler(async (req, res) => {
  const user = await adminAuthService.me(req.user!.userId);
  return sendSuccess(res, { user });
});

export const adminLogoutHandler = asyncHandler(async (req, res) => {
  const rawToken = readRefreshToken(req.cookies ?? {}, req.body);
  const bearerToken = readBearerToken(req.header('authorization')) || req.body?.accessToken;
  if (bearerToken) {
    await revokeAccessToken(bearerToken);
  }
  await adminAuthService.logout(rawToken || undefined);
  res.clearCookie(env.REFRESH_COOKIE_NAME, refreshCookieClearOptions());
  return sendSuccess(res, { loggedOut: true });
});
