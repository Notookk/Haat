import type { Request, Response } from 'express';
import {
  asyncHandler,
  sendSuccess,
  HttpStatus,
  User,
  SellerProfile,
  AppError,
  readBearerToken,
  revokeAccessToken,
} from '@haat/shared-backend';
import { sellerAuthService, formatSellerSessionProfile } from '../services/auth.service';
import type { SellerLoginInput, SellerRegisterInput } from '../validators/auth.validator';

const COOKIE_NAME = 'refreshToken';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export const sellerLoginHandler = asyncHandler(async (req: Request, res: Response) => {
  const session = await sellerAuthService.login(req.body as SellerLoginInput, {
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.cookie(COOKIE_NAME, session.refreshToken, COOKIE_OPTIONS);
  return sendSuccess(res, {
    user: session.user,
    seller: session.seller,
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
  });
});

export const sellerRegisterHandler = asyncHandler(async (req: Request, res: Response) => {
  const session = await sellerAuthService.register(req.body as SellerRegisterInput, {
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.cookie(COOKIE_NAME, session.refreshToken, COOKIE_OPTIONS);
  return sendSuccess(
    res,
    {
      user: session.user,
      seller: session.seller,
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    },
    HttpStatus.CREATED,
  );
});

export const sellerRefreshHandler = asyncHandler(async (req: Request, res: Response) => {
  const rawToken =
    (req.cookies?.[COOKIE_NAME] as string | undefined) ||
    (req.cookies?.['haat_rt'] as string | undefined) ||
    (req.cookies?.['haat_seller_rt'] as string | undefined) ||
    (req.body?.refreshToken as string | undefined);
  const session = await sellerAuthService.refresh(rawToken ?? '', {
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.cookie(COOKIE_NAME, session.refreshToken, COOKIE_OPTIONS);
  res.cookie('haat_rt', session.refreshToken, COOKIE_OPTIONS);
  return sendSuccess(res, {
    user: session.user,
    seller: session.seller,
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
  });
});

export const sellerLogoutHandler = asyncHandler(async (req: Request, res: Response) => {
  const rawToken =
    (req.cookies?.[COOKIE_NAME] as string | undefined) ||
    (req.cookies?.['haat_rt'] as string | undefined) ||
    (req.cookies?.['haat_seller_rt'] as string | undefined) ||
    (req.body?.refreshToken as string | undefined);
  const bearerToken = readBearerToken(req.header('authorization')) || req.body?.accessToken;
  if (bearerToken) {
    await revokeAccessToken(bearerToken);
  }
  await sellerAuthService.logout(rawToken);
  res.clearCookie(COOKIE_NAME, COOKIE_OPTIONS);
  res.clearCookie('haat_rt', COOKIE_OPTIONS);
  return sendSuccess(res, { loggedOut: true });
});

export const sellerMeHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendSuccess(res, { user: null, seller: null });
  }

  const [dbUser, seller] = await Promise.all([
    User.findById(req.user.id),
    SellerProfile.findOne({ userId: req.user.id }),
  ]);

  if (!dbUser) {
    return sendSuccess(res, { user: null, seller: null });
  }

  return sendSuccess(res, {
    user: {
      id: dbUser._id.toString(),
      fullName: dbUser.fullName,
      phoneNumber: dbUser.phoneNumber,
      email: dbUser.email ?? null,
      role: dbUser.role,
    },
    seller: formatSellerSessionProfile(seller),
  });
});

export const sellerChangePasswordHandler = asyncHandler(async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    throw AppError.badRequest('Both current and new passwords are required.');
  }
  await sellerAuthService.changePassword(req.user!.id, currentPassword, newPassword);
  return sendSuccess(res, { success: true });
});
