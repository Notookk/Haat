import { ERROR_CODES, type SellerOnboardingInput } from '@haat/shared-contracts';
import { AppError, SellerProfile, User, AuditLog, realtimeEventBus, slugify, uniqueSlug } from '@haat/shared-backend';
import type { UpdateStoreProfileInput } from '../validators/profile.validator';

export const sellerProfileService = {
  async onboard(userId: string, input: SellerOnboardingInput) {
    const existing = await SellerProfile.findOne({ userId });
    if (existing) {
      throw AppError.conflict('You already have a registered store on HAAT.');
    }

    let finalSlug: string;
    if (input.storeSlug && input.storeSlug.trim()) {
      const normalized = input.storeSlug.trim().toLowerCase();
      const slugTaken = await SellerProfile.findOne({ storeSlug: normalized });
      if (slugTaken) {
        throw AppError.conflict('That store link is already taken. Choose another.', ERROR_CODES.DUPLICATE_KEY);
      }
      finalSlug = normalized;
    } else {
      const base = slugify(input.storeName) || 'store';
      finalSlug = await uniqueSlug(base, async (candidate) => {
        const found = await SellerProfile.findOne({ storeSlug: candidate });
        return Boolean(found);
      });
    }

    const gstinTaken = await SellerProfile.findOne({ gstin: input.gstin.trim().toUpperCase() });
    if (gstinTaken) {
      throw AppError.conflict('This GSTIN is already registered to another store.', ERROR_CODES.DUPLICATE_KEY);
    }

    const now = new Date();
    const seller = await SellerProfile.create({
      userId,
      storeName: input.storeName.trim(),
      storeSlug: finalSlug,
      storeAddress: input.storeAddress?.trim() ?? null,
      description: input.description ?? null,
      logoUrl: input.logoUrl ?? null,
      bannerUrl: input.bannerUrl ?? null,
      gstin: input.gstin.trim().toUpperCase(),
      panNumber: input.panNumber.trim().toUpperCase(),
      bankAccountName: input.bankAccountName.trim(),
      bankAccountNo: input.bankAccountNo.trim(),
      bankIfscCode: input.bankIfscCode.trim().toUpperCase(),
      servicePincodes: input.servicePincodes,
      status: 'PENDING_APPROVAL',
      statusVersion: 1,
      statusUpdatedAt: now,
      isVerified: false,
      isActive: false,
      onboardingCompletedAt: now,
      statusHistory: [
        {
          previousStatus: 'PENDING_APPROVAL',
          newStatus: 'PENDING_APPROVAL',
          changedBy: userId,
          actorRole: 'SELLER',
          reason: 'Seller store application submitted for administrative approval.',
          statusVersion: 1,
          changedAt: now,
        },
      ],
    });

    await User.findByIdAndUpdate(userId, { role: 'SELLER' });

    try {
      await AuditLog.create({
        actorUserId: userId,
        actorRole: 'SELLER',
        action: 'SELLER_APPLICATION_SUBMITTED',
        entityType: 'SellerProfile',
        entityId: seller._id,
        metadata: {
          storeName: seller.storeName,
          gstin: seller.gstin,
          status: 'PENDING_APPROVAL',
        },
      });
    } catch {
      // Non-blocking
    }

    // Publish real-time events to notify Admins of the new application
    await realtimeEventBus.publishSellerApplicationCreated({
      sellerId: seller._id.toString(),
      storeName: seller.storeName,
      status: 'PENDING_APPROVAL',
      statusVersion: 1,
      action: 'APPLICATION_CREATED',
      actorId: userId,
      timestamp: now.toISOString(),
    });

    await realtimeEventBus.publishAdminSellerUpdated({
      sellerId: seller._id.toString(),
      storeName: seller.storeName,
      status: 'PENDING_APPROVAL',
      statusVersion: 1,
      isVerified: false,
      action: 'APPLICATION_CREATED',
      actorId: userId,
      timestamp: now.toISOString(),
    });

    await realtimeEventBus.publishSellerStatusChanged({
      sellerId: seller._id.toString(),
      storeName: seller.storeName,
      previousStatus: 'PENDING_APPROVAL',
      newStatus: 'PENDING_APPROVAL',
      statusVersion: 1,
      reason: 'Seller store application submitted for administrative approval.',
      changedBy: userId,
      actorRole: 'SELLER',
      changedAt: now.toISOString(),
    });

    return seller;
  },

  async getMyProfile(userId: string) {
    const seller = await SellerProfile.findOne({ userId });
    return seller;
  },

  async updateMyProfile(userId: string, input: UpdateStoreProfileInput) {
    const seller = await SellerProfile.findOne({ userId });
    if (!seller) {
      throw AppError.notFound('Store profile not found. Complete onboarding first.');
    }

    if (input.storeName !== undefined) seller.set('storeName', input.storeName.trim());
    if (input.storeAddress !== undefined) seller.set('storeAddress', input.storeAddress?.trim() ?? null);
    if (input.description !== undefined) seller.set('description', input.description);
    if (input.logoUrl !== undefined) seller.set('logoUrl', input.logoUrl ? input.logoUrl.trim() : null);
    if (input.bannerUrl !== undefined) seller.set('bannerUrl', input.bannerUrl ? input.bannerUrl.trim() : null);
    if (input.isOpen !== undefined) seller.set('isOpen', input.isOpen);
    if (input.businessPhone !== undefined) seller.set('businessPhone', input.businessPhone?.trim() ?? null);
    if (input.businessEmail !== undefined) seller.set('businessEmail', input.businessEmail?.trim() ?? null);
    if (input.bankAccountName) seller.set('bankAccountName', input.bankAccountName.trim());
    if (input.bankAccountNo) seller.set('bankAccountNo', input.bankAccountNo.trim());
    if (input.bankIfscCode) seller.set('bankIfscCode', input.bankIfscCode.trim().toUpperCase());
    if (input.servicePincodes !== undefined) seller.set('servicePincodes', input.servicePincodes);

    await seller.save();

    try {
      await AuditLog.create({
        actorUserId: userId,
        actorRole: 'SELLER',
        action: 'SELLER_PROFILE_UPDATED',
        entityType: 'SellerProfile',
        entityId: seller._id,
        metadata: { storeName: seller.storeName },
      });
    } catch {
      // Non-blocking
    }

    void realtimeEventBus.publishStoreUpdated({
      sellerId: seller._id.toString(),
      storeName: seller.storeName,
      storeSlug: seller.storeSlug,
      timestamp: new Date().toISOString(),
    });

    return seller;
  },

  async isSlugAvailable(slug: string): Promise<boolean> {
    const normalized = slug.trim().toLowerCase();
    const existing = await SellerProfile.findOne({ storeSlug: normalized });
    return !existing;
  },

  async resubmitApplication(userId: string, input: SellerOnboardingInput) {
    const seller = await SellerProfile.findOne({ userId });
    if (!seller) {
      throw AppError.notFound('Store profile not found.');
    }

    if (seller.status !== 'REJECTED' && seller.status !== 'PENDING_APPROVAL') {
      throw new AppError(
        ERROR_CODES.SELLER_STATE_TRANSITION_INVALID,
        `Cannot edit application with status ${seller.status}. Only PENDING_APPROVAL or REJECTED accounts can be edited and resubmitted.`,
        400,
      );
    }

    const currentVersion = seller.statusVersion || 1;
    const nextVersion = currentVersion + 1;
    const now = new Date();

    const newGstin = input.gstin ? input.gstin.trim().toUpperCase() : seller.gstin;
    if (newGstin !== seller.gstin) {
      const gstinTaken = await SellerProfile.findOne({ gstin: newGstin, _id: { $ne: seller._id } });
      if (gstinTaken) {
        throw AppError.conflict('This GSTIN is already registered to another store.', ERROR_CODES.DUPLICATE_KEY);
      }
    }

    const isRejected = seller.status === 'REJECTED';
    const auditAction = isRejected ? 'SELLER_APPLICATION_RESUBMITTED' : 'SELLER_APPLICATION_UPDATED';
    const reasonText = isRejected
      ? 'Seller re-submitted application for administrative review.'
      : 'Seller updated application response details while under administrative review.';

    const updated = await SellerProfile.findOneAndUpdate(
      { _id: seller._id, status: seller.status, statusVersion: currentVersion },
      {
        $set: {
          storeName: input.storeName.trim(),
          storeAddress: input.storeAddress?.trim() ?? null,
          description: input.description ?? null,
          gstin: newGstin,
          panNumber: input.panNumber ? input.panNumber.trim().toUpperCase() : seller.panNumber,
          logoUrl: input.logoUrl ?? null,
          bannerUrl: input.bannerUrl ?? null,
          bankAccountName: input.bankAccountName.trim(),
          bankAccountNo: input.bankAccountNo.trim(),
          bankIfscCode: input.bankIfscCode.trim().toUpperCase(),
          servicePincodes: input.servicePincodes,
          status: 'PENDING_APPROVAL',
          statusVersion: nextVersion,
          statusUpdatedAt: now,
          statusReason: null,
        },
        $push: {
          statusHistory: {
            previousStatus: seller.status,
            newStatus: 'PENDING_APPROVAL',
            changedBy: userId,
            actorRole: 'SELLER',
            reason: reasonText,
            statusVersion: nextVersion,
            changedAt: now,
          },
        },
      },
      { new: true },
    );

    if (!updated) {
      throw new AppError(ERROR_CODES.CONFLICT, 'Concurrent update detected. Please try again.', 409);
    }

    try {
      await AuditLog.create({
        actorUserId: userId,
        actorRole: 'SELLER',
        action: auditAction,
        entityType: 'SellerProfile',
        entityId: updated._id.toString(),
        metadata: {
          previousStatus: seller.status,
          newStatus: 'PENDING_APPROVAL',
          storeName: updated.storeName,
          statusVersion: nextVersion,
        },
      });
    } catch {
      // Non-blocking
    }

    await realtimeEventBus.publishSellerStatusChanged({
      sellerId: updated._id.toString(),
      storeName: updated.storeName,
      previousStatus: seller.status,
      newStatus: 'PENDING_APPROVAL',
      statusVersion: nextVersion,
      reason: reasonText,
      changedBy: userId,
      actorRole: 'SELLER',
      changedAt: now.toISOString(),
    });

    await realtimeEventBus.publishAdminSellerUpdated({
      sellerId: updated._id.toString(),
      storeName: updated.storeName,
      status: 'PENDING_APPROVAL',
      statusVersion: nextVersion,
      isVerified: false,
      action: 'RESUBMITTED',
      actorId: userId,
      timestamp: now.toISOString(),
    });

    return updated;
  },
};
