import { ERROR_CODES, isValidSellerStatusTransition, type SellerStatus } from '@haat/shared-contracts';
import {
  AppError,
  AuditLog,
  SellerProfile,
  Product,
  RefreshToken,
  User,
  realtimeEventBus,
  Order,
  DeliverySlot,
  initializeDefaultDeliverySlots,
  DeliveryBlackout,
  ChatMessage,
  ChatConversation,
} from '@haat/shared-backend';
import { adminSellerModel, type SellerFilter } from '../models/seller.model';

export const adminSellerService = {
  async listSellers(filter: SellerFilter) {
    return adminSellerModel.listSellers(filter);
  },

  async getSellerStats() {
    return adminSellerModel.getSellerStats();
  },

  async getSeller(id: string) {
    const seller = await adminSellerModel.findSellerById(id);
    if (!seller) {
      throw new AppError(ERROR_CODES.NOT_FOUND, 'Seller not found.', 404);
    }
    return seller;
  },

  async getSellerAnalytics(sellerId: string) {
    const seller = await SellerProfile.findById(sellerId).populate('userId', 'fullName email phoneNumber').lean();
    if (!seller) {
      throw new AppError(ERROR_CODES.NOT_FOUND, 'Seller not found.', 404);
    }

    const [totalProducts, allProducts, totalOrders, completedOrdersAgg] = await Promise.all([
      Product.countDocuments({ sellerId: seller._id }),
      Product.find({ sellerId: seller._id }).sort({ retailPricePaise: -1 }).limit(10).lean(),
      Order.countDocuments({ sellerId: seller._id }),
      Order.aggregate([
        { $match: { sellerId: seller._id, paymentStatus: 'PAID' } },
        {
          $group: {
            _id: null,
            totalRevenuePaise: { $sum: '$totalAmountPaise' },
            completedOrdersCount: { $sum: 1 },
          },
        },
      ]),
    ]);

    const totalRevenuePaise = completedOrdersAgg[0]?.totalRevenuePaise || 0;
    const completedOrders = completedOrdersAgg[0]?.completedOrdersCount || 0;
    const averageOrderValuePaise = completedOrders > 0 ? Math.round(totalRevenuePaise / completedOrders) : 0;

    // 14-day timeline
    const days = 14;
    const now = new Date();
    const dates: Array<{ date: string; label: string }> = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const label = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(d);
      dates.push({ date: d.toISOString().split('T')[0], label });
    }

    const salesTrends = dates.map((d) => ({
      date: d.date,
      label: d.label,
      value: 0,
      secondaryValue: 0,
    }));

    const bestSellingProducts = allProducts.map((p) => ({
      id: p._id.toString(),
      title: p.title,
      sku: p.sku,
      retailPricePaise: p.retailPricePaise,
      variantsCount: p.variants?.length || 0,
      stockQuantity: (p.variants || []).reduce((acc: number, v: any) => acc + (v.stockQuantity || 0), 0),
      isWholesaleActive: p.isWholesaleActive,
    }));

    return {
      seller: {
        id: seller._id.toString(),
        storeName: seller.storeName,
        storeSlug: seller.storeSlug,
        ownerName: (seller.userId as any)?.fullName || 'N/A',
        status: seller.status,
      },
      metrics: {
        totalRevenuePaise,
        totalCompletedOrders: completedOrders,
        totalOrders,
        totalProducts,
        averageOrderValuePaise,
        retailRevenuePaise: totalRevenuePaise,
        wholesaleRevenuePaise: 0,
      },
      salesTrends,
      bestSellingProducts,
    };
  },

  async getSellerStatusHistory(sellerId: string) {
    const seller = await SellerProfile.findById(sellerId).select(
      'storeName storeSlug status statusVersion statusUpdatedAt statusHistory isVerified',
    );
    if (!seller) {
      throw new AppError(ERROR_CODES.NOT_FOUND, 'Seller not found.', 404);
    }

    const auditLogs = await AuditLog.find({
      entityType: 'SellerProfile',
      entityId: seller._id.toString(),
    }).sort({ createdAt: -1 });

    return {
      sellerId: seller._id.toString(),
      storeName: seller.storeName,
      storeSlug: seller.storeSlug,
      currentStatus: seller.status,
      statusVersion: seller.statusVersion || 1,
      statusUpdatedAt: seller.statusUpdatedAt,
      isVerified: seller.isVerified,
      statusHistory: seller.statusHistory,
      auditLogs,
    };
  },

  async approveSeller(params: {
    sellerId: string;
    notes?: string;
    adminUserId: string;
    adminRole: string;
    ipAddress?: string;
  }) {
    const seller = await SellerProfile.findById(params.sellerId);
    if (!seller) {
      throw new AppError(ERROR_CODES.NOT_FOUND, 'Seller not found.', 404);
    }

    const currentStatus = (seller.status || (seller.isActive ? 'ACTIVE' : 'PENDING_APPROVAL')) as SellerStatus;
    if (!isValidSellerStatusTransition(currentStatus, 'ACTIVE')) {
      throw new AppError(
        ERROR_CODES.SELLER_STATE_TRANSITION_INVALID,
        `Cannot approve a seller with status ${currentStatus}. Only PENDING_APPROVAL or REJECTED accounts can be approved.`,
        400,
      );
    }

    const previousStatus = currentStatus;
    const currentVersion = seller.statusVersion || 1;
    const nextVersion = currentVersion + 1;
    const now = new Date();

    // Atomic State Transition with Optimistic Concurrency Lock (PRD §3)
    const updated = await SellerProfile.findOneAndUpdate(
      { _id: seller._id, statusVersion: currentVersion, status: previousStatus },
      {
        $set: {
          status: 'ACTIVE',
          statusVersion: nextVersion,
          statusUpdatedAt: now,
          isActive: true,
          isVerified: true,
          approvedAt: now,
          approvedBy: params.adminUserId as any,
          approvalNotes: (params.notes ?? null) as any,
          blockedAt: null as any,
          blockedBy: null as any,
          blockedReason: null as any,
          statusReason: null as any,
        },
        $push: {
          statusHistory: {
            previousStatus,
            newStatus: 'ACTIVE',
            changedBy: params.adminUserId as any,
            actorRole: params.adminRole,
            reason: 'Seller application approved for active marketplace operations.',
            notes: (params.notes || null) as any,
            statusVersion: nextVersion,
            changedAt: now,
          },
        },
      },
      { new: true },
    );

    if (!updated) {
      throw new AppError(
        ERROR_CODES.CONFLICT,
        'Seller status was modified concurrently by another administrative action. Please refresh and try again.',
        409,
      );
    }

    // Update all existing products of this seller so they immediately become visible in Buyer catalog
    await Product.updateMany({ sellerId: updated._id }, { $set: { sellerStatus: 'ACTIVE' } });

    // Initialize 3 default delivery slots ONCE when seller is verified and approved by admin
    await initializeDefaultDeliverySlots(updated._id);

    // Immutable Audit Log
    await AuditLog.create({
      actorUserId: params.adminUserId,
      action: 'SELLER_APPROVED',
      entityType: 'SellerProfile',
      entityId: updated._id.toString(),
      metadata: {
        previousStatus,
        newStatus: 'ACTIVE',
        storeName: updated.storeName,
        statusVersion: nextVersion,
        notes: params.notes ?? null,
      },
      ipAddress: params.ipAddress ?? null,
    });

    // Publish Real-time Events
    await realtimeEventBus.publishSellerStatusChanged({
      sellerId: updated._id.toString(),
      userId: updated.userId?.toString(),
      storeName: updated.storeName,
      previousStatus,
      newStatus: 'ACTIVE',
      statusVersion: nextVersion,
      reason: 'Seller application approved for active marketplace operations.',
      changedBy: params.adminUserId,
      actorRole: params.adminRole,
      changedAt: now.toISOString(),
    });

    await realtimeEventBus.publishCatalogVisibilityChanged({
      sellerId: updated._id.toString(),
      sellerStatus: 'ACTIVE',
      action: 'PRODUCTS_SHOWN',
      timestamp: now.toISOString(),
    });

    await realtimeEventBus.publishAdminSellerUpdated({
      sellerId: updated._id.toString(),
      storeName: updated.storeName,
      status: 'ACTIVE',
      statusVersion: nextVersion,
      isVerified: true,
      action: 'APPROVED',
      actorId: params.adminUserId,
      timestamp: now.toISOString(),
    });

    return adminSellerModel.findSellerById(params.sellerId);
  },

  async rejectSeller(params: {
    sellerId: string;
    reason: string;
    adminUserId: string;
    adminRole: string;
    ipAddress?: string;
  }) {
    const seller = await SellerProfile.findById(params.sellerId);
    if (!seller) {
      throw new AppError(ERROR_CODES.NOT_FOUND, 'Seller not found.', 404);
    }

    const currentStatus = (seller.status || (seller.isActive ? 'ACTIVE' : 'PENDING_APPROVAL')) as SellerStatus;
    if (!isValidSellerStatusTransition(currentStatus, 'REJECTED')) {
      throw new AppError(
        ERROR_CODES.SELLER_STATE_TRANSITION_INVALID,
        `Cannot reject a seller with status ${currentStatus}. Only PENDING_APPROVAL or ACTIVE accounts can be rejected.`,
        400,
      );
    }

    const previousStatus = currentStatus;
    const currentVersion = seller.statusVersion || 1;
    const nextVersion = currentVersion + 1;
    const now = new Date();

    // Atomic State Transition with Optimistic Concurrency Lock (PRD §3)
    const updated = await SellerProfile.findOneAndUpdate(
      { _id: seller._id, statusVersion: currentVersion, status: previousStatus },
      {
        $set: {
          status: 'REJECTED',
          statusVersion: nextVersion,
          statusUpdatedAt: now,
          isActive: false,
          statusReason: params.reason,
        },
        $push: {
          statusHistory: {
            previousStatus,
            newStatus: 'REJECTED',
            changedBy: params.adminUserId as any,
            actorRole: params.adminRole,
            reason: params.reason,
            notes: null as any,
            statusVersion: nextVersion,
            changedAt: now,
          },
        },
      },
      { new: true },
    );

    if (!updated) {
      throw new AppError(
        ERROR_CODES.CONFLICT,
        'Seller status was modified concurrently by another administrative action. Please refresh and try again.',
        409,
      );
    }

    // Ensure all products remain hidden
    await Product.updateMany({ sellerId: updated._id }, { $set: { sellerStatus: 'REJECTED' } });

    // Immutable Audit Log
    await AuditLog.create({
      actorUserId: params.adminUserId,
      action: 'SELLER_REJECTED',
      entityType: 'SellerProfile',
      entityId: updated._id.toString(),
      metadata: {
        previousStatus,
        newStatus: 'REJECTED',
        storeName: updated.storeName,
        statusVersion: nextVersion,
        reason: params.reason,
      },
      ipAddress: params.ipAddress ?? null,
    });

    // Publish Real-time Events
    await realtimeEventBus.publishSellerStatusChanged({
      sellerId: updated._id.toString(),
      userId: updated.userId?.toString(),
      storeName: updated.storeName,
      previousStatus,
      newStatus: 'REJECTED',
      statusVersion: nextVersion,
      reason: params.reason,
      changedBy: params.adminUserId,
      actorRole: params.adminRole,
      changedAt: now.toISOString(),
    });

    await realtimeEventBus.publishCatalogVisibilityChanged({
      sellerId: updated._id.toString(),
      sellerStatus: 'REJECTED',
      action: 'PRODUCTS_HIDDEN',
      timestamp: now.toISOString(),
    });

    await realtimeEventBus.publishAdminSellerUpdated({
      sellerId: updated._id.toString(),
      storeName: updated.storeName,
      status: 'REJECTED',
      statusVersion: nextVersion,
      isVerified: updated.isVerified,
      action: 'REJECTED',
      actorId: params.adminUserId,
      reason: params.reason,
      timestamp: now.toISOString(),
    });

    return adminSellerModel.findSellerById(params.sellerId);
  },

  async blockSeller(params: {
    sellerId: string;
    reason: string;
    adminUserId: string;
    adminRole: string;
    ipAddress?: string;
  }) {
    const seller = await SellerProfile.findById(params.sellerId);
    if (!seller) {
      throw new AppError(ERROR_CODES.NOT_FOUND, 'Seller not found.', 404);
    }

    const currentStatus = (seller.status || (seller.isActive ? 'ACTIVE' : 'PENDING_APPROVAL')) as SellerStatus;
    if (!isValidSellerStatusTransition(currentStatus, 'BLOCKED')) {
      throw new AppError(
        ERROR_CODES.SELLER_STATE_TRANSITION_INVALID,
        `Cannot block a seller with status ${currentStatus}. Only ACTIVE sellers can be blocked.`,
        400,
      );
    }

    const previousStatus = currentStatus;
    const currentVersion = seller.statusVersion || 1;
    const nextVersion = currentVersion + 1;
    const now = new Date();

    // Atomic State Transition with Optimistic Concurrency Lock (PRD §3)
    const updated = await SellerProfile.findOneAndUpdate(
      { _id: seller._id, statusVersion: currentVersion, status: previousStatus },
      {
        $set: {
          status: 'BLOCKED',
          statusVersion: nextVersion,
          statusUpdatedAt: now,
          isActive: false,
          blockedAt: now,
          blockedBy: params.adminUserId as any,
          blockedReason: params.reason,
        },
        $push: {
          statusHistory: {
            previousStatus,
            newStatus: 'BLOCKED',
            changedBy: params.adminUserId as any,
            actorRole: params.adminRole,
            reason: params.reason,
            notes: null as any,
            statusVersion: nextVersion,
            changedAt: now,
          },
        },
      },
      { new: true },
    );

    if (!updated) {
      throw new AppError(
        ERROR_CODES.CONFLICT,
        'Seller status was modified concurrently by another administrative action. Please refresh and try again.',
        409,
      );
    }

    // 1. Mandatory Session Revocation: Invalidate all refresh tokens for this seller user
    await RefreshToken.updateMany({ userId: updated.userId, revokedAt: null }, { $set: { revokedAt: now } });

    // 2. Bump user tokenVersion so any existing JWT sessions are invalidated on token refresh
    await User.findByIdAndUpdate(updated.userId, { $inc: { tokenVersion: 1 } });

    // 3. Immediate Product Removal: Set sellerStatus to BLOCKED on all products of this seller
    await Product.updateMany({ sellerId: updated._id }, { $set: { sellerStatus: 'BLOCKED' } });

    // 4. Immutable Audit Log
    await AuditLog.create({
      actorUserId: params.adminUserId,
      action: 'SELLER_BLOCKED',
      entityType: 'SellerProfile',
      entityId: updated._id.toString(),
      metadata: {
        previousStatus,
        newStatus: 'BLOCKED',
        storeName: updated.storeName,
        statusVersion: nextVersion,
        reason: params.reason,
      },
      ipAddress: params.ipAddress ?? null,
    });

    // 5. Publish Real-time Blocking Event (disconnects sockets & invalidates caches across platform)
    await realtimeEventBus.publishSellerStatusChanged({
      sellerId: updated._id.toString(),
      userId: updated.userId?.toString(),
      storeName: updated.storeName,
      previousStatus,
      newStatus: 'BLOCKED',
      statusVersion: nextVersion,
      reason: params.reason,
      changedBy: params.adminUserId,
      actorRole: params.adminRole,
      changedAt: now.toISOString(),
    });

    await realtimeEventBus.publishCatalogVisibilityChanged({
      sellerId: updated._id.toString(),
      sellerStatus: 'BLOCKED',
      action: 'PRODUCTS_HIDDEN',
      timestamp: now.toISOString(),
    });

    await realtimeEventBus.publishAdminSellerUpdated({
      sellerId: updated._id.toString(),
      storeName: updated.storeName,
      status: 'BLOCKED',
      statusVersion: nextVersion,
      isVerified: updated.isVerified,
      action: 'BLOCKED',
      actorId: params.adminUserId,
      reason: params.reason,
      timestamp: now.toISOString(),
    });

    return adminSellerModel.findSellerById(params.sellerId);
  },

  async unblockSeller(params: {
    sellerId: string;
    reason?: string;
    adminUserId: string;
    adminRole: string;
    ipAddress?: string;
  }) {
    const seller = await SellerProfile.findById(params.sellerId);
    if (!seller) {
      throw new AppError(ERROR_CODES.NOT_FOUND, 'Seller not found.', 404);
    }

    const currentStatus = (seller.status || (seller.isActive ? 'ACTIVE' : 'PENDING_APPROVAL')) as SellerStatus;
    if (!isValidSellerStatusTransition(currentStatus, 'ACTIVE')) {
      throw new AppError(
        ERROR_CODES.SELLER_STATE_TRANSITION_INVALID,
        `Cannot unblock a seller with status ${currentStatus}. Only BLOCKED accounts can be unblocked.`,
        400,
      );
    }

    const previousStatus = currentStatus;
    const currentVersion = seller.statusVersion || 1;
    const nextVersion = currentVersion + 1;
    const now = new Date();
    const unblockReason = params.reason || 'Seller account unblocked by marketplace administration.';

    // Atomic State Transition with Optimistic Concurrency Lock (PRD §3)
    const updated = await SellerProfile.findOneAndUpdate(
      { _id: seller._id, statusVersion: currentVersion, status: previousStatus },
      {
        $set: {
          status: 'ACTIVE',
          statusVersion: nextVersion,
          statusUpdatedAt: now,
          isActive: true,
          blockedAt: null as any,
          blockedBy: null as any,
          blockedReason: null as any,
          statusReason: unblockReason,
        },
        $push: {
          statusHistory: {
            previousStatus,
            newStatus: 'ACTIVE',
            changedBy: params.adminUserId as any,
            actorRole: params.adminRole,
            reason: unblockReason,
            notes: null as any,
            statusVersion: nextVersion,
            changedAt: now,
          },
        },
      },
      { new: true },
    );

    if (!updated) {
      throw new AppError(
        ERROR_CODES.CONFLICT,
        'Seller status was modified concurrently by another administrative action. Please refresh and try again.',
        409,
      );
    }

    // Restore eligible products to public visibility
    await Product.updateMany({ sellerId: updated._id }, { $set: { sellerStatus: 'ACTIVE' } });

    // Immutable Audit Log
    await AuditLog.create({
      actorUserId: params.adminUserId,
      action: 'SELLER_UNBLOCKED',
      entityType: 'SellerProfile',
      entityId: updated._id.toString(),
      metadata: {
        previousStatus,
        newStatus: 'ACTIVE',
        storeName: updated.storeName,
        statusVersion: nextVersion,
        reason: unblockReason,
      },
      ipAddress: params.ipAddress ?? null,
    });

    // Publish Real-time Unblocking Event
    await realtimeEventBus.publishSellerStatusChanged({
      sellerId: updated._id.toString(),
      userId: updated.userId?.toString(),
      storeName: updated.storeName,
      previousStatus,
      newStatus: 'ACTIVE',
      statusVersion: nextVersion,
      reason: unblockReason,
      changedBy: params.adminUserId,
      actorRole: params.adminRole,
      changedAt: now.toISOString(),
    });

    await realtimeEventBus.publishCatalogVisibilityChanged({
      sellerId: updated._id.toString(),
      sellerStatus: 'ACTIVE',
      action: 'PRODUCTS_SHOWN',
      timestamp: now.toISOString(),
    });

    await realtimeEventBus.publishAdminSellerUpdated({
      sellerId: updated._id.toString(),
      storeName: updated.storeName,
      status: 'ACTIVE',
      statusVersion: nextVersion,
      isVerified: updated.isVerified,
      action: 'UNBLOCKED',
      actorId: params.adminUserId,
      reason: unblockReason,
      timestamp: now.toISOString(),
    });

    return adminSellerModel.findSellerById(params.sellerId);
  },

  async deleteSeller(params: {
    sellerId: string;
    adminUserId: string;
    adminRole: string;
    ipAddress?: string;
  }) {
    const seller = await SellerProfile.findById(params.sellerId);
    if (!seller) {
      throw new AppError(ERROR_CODES.NOT_FOUND, 'Seller not found.', 404);
    }

    const sellerId = seller._id.toString();
    const storeSlug = seller.storeSlug;
    const storeName = seller.storeName;

    // 1. Delete all products belonging to this seller
    const products = await Product.find({ sellerId: seller._id }).lean();
    await Product.deleteMany({ sellerId: seller._id });

    // 2. Delete delivery slots & blackouts
    await DeliverySlot.deleteMany({ sellerId: seller._id });
    await DeliveryBlackout.deleteMany({ sellerId: seller._id });

    // 3. Delete chat messages & conversations
    if (storeSlug) {
      await ChatMessage.deleteMany({ sellerSlug: storeSlug });
      await ChatConversation.deleteMany({ sellerSlug: storeSlug });
    }

    // 4. Revoke tokens for the user
    if (seller.userId) {
      await RefreshToken.deleteMany({ userId: seller.userId });
    }

    // 5. Delete the SellerProfile record
    await SellerProfile.findByIdAndDelete(seller._id);

    // 6. Record immutable Audit Log
    await AuditLog.create({
      actorUserId: params.adminUserId,
      action: 'SELLER_DELETED',
      entityType: 'SellerProfile',
      entityId: sellerId,
      metadata: {
        storeName,
        storeSlug,
        deletedProductsCount: products.length,
      },
      ipAddress: params.ipAddress ?? null,
    });

    // 7. Publish Real-time events to all clients
    await realtimeEventBus.publishCatalogVisibilityChanged({
      sellerId,
      sellerStatus: 'BLOCKED',
      action: 'PRODUCTS_HIDDEN',
      timestamp: new Date().toISOString(),
    });

    await realtimeEventBus.publishAdminSellerUpdated({
      sellerId,
      storeName,
      status: 'BLOCKED',
      statusVersion: (seller.statusVersion || 1) + 1,
      isVerified: false,
      action: 'BLOCKED',
      actorId: params.adminUserId,
      reason: 'Seller permanently deleted by admin',
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      message: `Seller "${storeName}" and associated catalog deleted successfully.`,
      sellerId,
    };
  },
};
