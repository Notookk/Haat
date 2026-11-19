import type { RequestHandler } from 'express';
import { ERROR_CODES } from '@haat/shared-contracts';
import { AppError, SellerProfile } from '@haat/shared-backend';

/**
 * Centrally enforces that the authenticated user:
 * 1. Has role SELLER (or ADMIN/SUPER_ADMIN).
 * 2. Owns an existing SellerProfile.
 * 3. Has account status ACTIVE.
 *
 * If the seller is BLOCKED, PENDING_APPROVAL, or REJECTED, an authoritative 403 Forbidden
 * response is immediately returned, blocking any operational API access even if an unexpired
 * access token was presented.
 */
export const requireActiveSeller: RequestHandler = async (req, _res, next) => {
  try {
    if (!req.user || !req.user.userId) {
      next(AppError.unauthorized('Sign in to continue.'));
      return;
    }

    if (req.user.role !== 'SELLER' && req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      next(AppError.forbidden('Access denied. Seller authentication required.'));
      return;
    }

    const seller = await SellerProfile.findOne({ userId: req.user.userId });
    if (!seller) {
      next(new AppError(ERROR_CODES.NOT_FOUND, 'Seller store not found. Please complete store registration.', 404));
      return;
    }

    if (seller.status === 'BLOCKED') {
      next(
        new AppError(
          ERROR_CODES.SELLER_ACCOUNT_BLOCKED,
          `Your seller account has been blocked by marketplace administration: ${seller.blockedReason || 'Please contact support.'}`,
          403,
        ),
      );
      return;
    }

    if (seller.status === 'PENDING_APPROVAL') {
      next(
        new AppError(
          ERROR_CODES.SELLER_ACCOUNT_PENDING,
          'Your seller application is pending administrative review. Store management operations are restricted until approval.',
          403,
        ),
      );
      return;
    }

    if (seller.status === 'REJECTED') {
      next(
        new AppError(
          ERROR_CODES.SELLER_ACCOUNT_REJECTED,
          `Your seller application was not approved: ${seller.statusReason || 'Please review guidelines and contact support.'}`,
          403,
        ),
      );
      return;
    }

    if (seller.status !== 'ACTIVE') {
      next(new AppError(ERROR_CODES.FORBIDDEN, 'Your seller account is not active.', 403));
      return;
    }

    // Attach verified active seller document for downstream handlers
    (req as unknown as { seller: typeof seller }).seller = seller;
    next();
  } catch (error) {
    next(error);
  }
};
