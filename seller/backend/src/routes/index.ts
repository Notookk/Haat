import { Router } from 'express';
import {
  Category,
  Product,
  SellerProfile,
  ChatMessage,
  ChatConversation,
  asyncHandler,
  sendSuccess,
  requireAuth,
  AppError,
  HttpStatus,
  deleteCloudinaryImages,
  extractCloudinaryPublicId,
  realtimeEventBus,
} from '@haat/shared-backend';
import { requireActiveSeller } from '../middleware/requireActiveSeller';
import { sellerAuthRouter } from '../modules/auth/routes/auth.routes';
import { sellerProfileRouter } from '../modules/profile/routes/profile.routes';
import { sellerProductRouter } from '../modules/products/routes/product.routes';
import { sellerDashboardRouter } from '../modules/dashboard/routes/dashboard.routes';
import { sellerDeliveryRouter } from '../modules/delivery/routes/delivery.routes';
import { sellerOrderRouter } from '../modules/orders/routes/order.routes';
import { sellerRevenueRouter } from '../modules/revenue/routes/revenue.routes';
import { sellerUploadRouter } from '../modules/uploads/upload.routes';

export const sellerApiRouter = Router();

sellerApiRouter.get('/health', (_req, res) => {
  res.status(200).json({ success: true, status: 'ok', service: 'haat-seller-api' });
});

// Categories lookup & creation for product creation (requires active seller)
sellerApiRouter.get(
  '/categories',
  requireAuth,
  requireActiveSeller,
  asyncHandler(async (_req, res) => {
    const categories = await Category.find({ isActive: true }).sort({ createdAt: 1, _id: 1 }).lean();
    return sendSuccess(res, { categories });
  }),
);

sellerApiRouter.post(
  '/categories',
  requireAuth,
  requireActiveSeller,
  asyncHandler(async (req, res) => {
    const { name, description, imageUrl, imagePublicId } = req.body ?? {};
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      throw AppError.badRequest('Category name must be at least 2 characters');
    }
    const cleanName = name.trim();
    let baseSlug = cleanName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    if (!baseSlug) baseSlug = 'category';
    let slug = baseSlug;
    let counter = 1;
    while (await Category.exists({ slug })) {
      slug = `${baseSlug}-${counter++}`;
    }
    const category = await Category.create({
      name: cleanName,
      slug,
      description: typeof description === 'string' && description.trim() ? description.trim() : null,
      imageUrl: typeof imageUrl === 'string' && imageUrl.trim() ? imageUrl.trim() : null,
      imagePublicId: typeof imagePublicId === 'string' && imagePublicId.trim() ? imagePublicId.trim() : null,
      parentId: null,
      path: slug,
      depth: 0,
      isActive: true,
      productCount: 0,
    });

    void realtimeEventBus.publishCategoryCreated({
      categoryId: category._id.toString(),
      action: 'CREATED',
      name: category.name,
      slug: category.slug,
      timestamp: new Date().toISOString(),
    });

    return sendSuccess(res, { category }, HttpStatus.CREATED);
  }),
);

sellerApiRouter.patch(
  '/categories/:id',
  requireAuth,
  requireActiveSeller,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, description, imageUrl, imagePublicId } = req.body ?? {};
    const category = await Category.findById(id);
    if (!category) {
      throw AppError.notFound('Category not found');
    }
    if (typeof name === 'string' && name.trim()) {
      if (name.trim().length < 2) {
        throw AppError.badRequest('Category name must be at least 2 characters');
      }
      category.name = name.trim();
    }
    if (description !== undefined) {
      (category as any).description = typeof description === 'string' && description.trim() ? description.trim() : null;
    }

    const oldPublicId = (category as any).imagePublicId || extractCloudinaryPublicId((category as any).imageUrl);

    if (imageUrl !== undefined) {
      (category as any).imageUrl = typeof imageUrl === 'string' && imageUrl.trim() ? imageUrl.trim() : null;
    }
    if (imagePublicId !== undefined) {
      (category as any).imagePublicId = typeof imagePublicId === 'string' && imagePublicId.trim() ? imagePublicId.trim() : null;
    }

    const newPublicId = (category as any).imagePublicId || extractCloudinaryPublicId((category as any).imageUrl);

    // If an image was replaced or removed, clean up old image from Cloudinary
    if (oldPublicId && oldPublicId !== newPublicId) {
      void (async () => {
        try {
          await deleteCloudinaryImages([oldPublicId]);
        } catch (err) {
          console.error(`Error deleting old Cloudinary image for category ${id}:`, err);
        }
      })();
    }

    await category.save();

    void realtimeEventBus.publishCategoryUpdated({
      categoryId: category._id.toString(),
      action: 'UPDATED',
      name: category.name,
      slug: category.slug,
      timestamp: new Date().toISOString(),
    });

    return sendSuccess(res, { category });
  }),
);

sellerApiRouter.delete(
  '/categories/:id',
  requireAuth,
  requireActiveSeller,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const category = await Category.findById(id);
    if (!category) {
      throw AppError.notFound('Category not found');
    }

    // Determine category image publicId before database deletion
    const imagePublicId = (category as any).imagePublicId || extractCloudinaryPublicId((category as any).imageUrl);

    const productCount = await Product.countDocuments({ categoryId: id });
    if (productCount > 0) {
      category.isActive = false;
      (category as any).imageUrl = null;
      (category as any).imagePublicId = null;
      await category.save();
    } else {
      await Category.findByIdAndDelete(id);
    }

    // Permanently remove category image from Cloudinary
    if (imagePublicId) {
      void (async () => {
        try {
          await deleteCloudinaryImages([imagePublicId]);
        } catch (err) {
          console.error(`Error deleting Cloudinary image for category ${id}:`, err);
        }
      })();
    }

    void realtimeEventBus.publishCategoryDeleted({
      categoryId: id,
      action: 'DELETED',
      name: category.name,
      slug: category.slug,
      timestamp: new Date().toISOString(),
    });

    return sendSuccess(res, { message: 'Category removed successfully', id });
  }),
);

sellerApiRouter.use('/auth', sellerAuthRouter);
sellerApiRouter.use('/profile', sellerProfileRouter);

// Strictly protected operational business endpoints: Require verified ACTIVE seller account
sellerApiRouter.use('/products', requireAuth, requireActiveSeller, sellerProductRouter);
sellerApiRouter.use('/dashboard', requireAuth, requireActiveSeller, sellerDashboardRouter);
// Scheduled slot delivery: public /available/:sellerId for buyers, protected /slots for sellers
sellerApiRouter.use('/delivery', sellerDeliveryRouter);
sellerApiRouter.use('/orders', requireAuth, requireActiveSeller, sellerOrderRouter);
sellerApiRouter.use('/revenue', requireAuth, requireActiveSeller, sellerRevenueRouter);
sellerApiRouter.use('/uploads', requireAuth, requireActiveSeller, sellerUploadRouter);

// Seller Customer Chat Endpoints
sellerApiRouter.get(
  '/chat/conversations',
  requireAuth,
  requireActiveSeller,
  asyncHandler(async (req, res) => {
    const seller = await SellerProfile.findOne({ userId: req.user!.id }).lean();
    if (!seller) return sendSuccess(res, { conversations: [] });
    const slug = seller.storeSlug.toLowerCase().trim();
    const convs = await ChatConversation.find({ sellerSlug: slug }).sort({ lastMessageAt: -1 }).lean();

    const result = [];
    for (const conv of convs) {
      const buyerConditions: any[] = [{ buyerName: conv.buyerName }];
      if (conv.buyerId) buyerConditions.push({ buyerId: String(conv.buyerId) });
      const unreadCount = await ChatMessage.countDocuments({
        sellerSlug: slug,
        sender: 'BUYER',
        isRead: false,
        deletedForSeller: { $ne: true },
        $or: buyerConditions,
      });
      const latestVisible = await ChatMessage.findOne({
        sellerSlug: slug,
        deletedForSeller: { $ne: true },
        $or: buyerConditions,
      }).sort({ createdAt: -1 }).lean();

      // If no messages left for seller, don't show conversation in list
      if (!latestVisible) continue;

      result.push({
        buyerName: conv.buyerName,
        buyerId: conv.buyerId || null,
        sellerSlug: slug,
        sellerName: seller.storeName,
        lastMessage: latestVisible.text,
        lastMessageAt: (latestVisible as any)?.createdAt || conv.lastMessageAt || (conv as any).updatedAt,
        unreadCount,
        isBlocked: Boolean(conv.isBlocked),
        blockedBy: conv.blockedBy || null,
        blockedReason: conv.blockedReason || null,
      });
    }

    return sendSuccess(res, { conversations: result });
  }),
);

sellerApiRouter.get(
  '/chat/unread-count',
  requireAuth,
  requireActiveSeller,
  asyncHandler(async (req, res) => {
    const seller = await SellerProfile.findOne({ userId: req.user!.id }).lean();
    if (!seller) return sendSuccess(res, { unreadCount: 0 });
    const count = await ChatMessage.countDocuments({
      sellerSlug: seller.storeSlug.toLowerCase().trim(),
      sender: 'BUYER',
      isRead: false,
      deletedForSeller: { $ne: true },
    });
    return sendSuccess(res, { unreadCount: count });
  }),
);

sellerApiRouter.post(
  '/chat/read',
  requireAuth,
  requireActiveSeller,
  asyncHandler(async (req, res) => {
    const seller = await SellerProfile.findOne({ userId: req.user!.id }).lean();
    if (!seller) throw AppError.forbidden('Seller profile required');
    const { buyerName, buyerId } = req.body ?? {};
    const slug = seller.storeSlug.toLowerCase().trim();

    const conditions: any[] = [];
    if (buyerId) {
      conditions.push({ buyerId: String(buyerId) });
    }
    if (buyerName) {
      const trimmed = String(buyerName).trim();
      conditions.push({ buyerName: trimmed });
      conditions.push({
        buyerName: { $regex: new RegExp(`^${trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      });
    }

    const filter: any = {
      sellerSlug: slug,
      sender: 'BUYER',
      isRead: false,
    };
    if (conditions.length > 0) {
      filter.$or = conditions;
    }

    await ChatMessage.updateMany(filter, { $set: { isRead: true } });
    return sendSuccess(res, { success: true });
  }),
);

sellerApiRouter.post(
  '/chat/block',
  requireAuth,
  requireActiveSeller,
  asyncHandler(async (req, res) => {
    const seller = await SellerProfile.findOne({ userId: req.user!.id }).lean();
    if (!seller) throw AppError.forbidden('Seller profile required');
    const { buyerId, buyerName, reason } = req.body ?? {};
    const slug = seller.storeSlug.toLowerCase().trim();
    const query: any = { sellerSlug: slug };
    if (buyerId) query.$or = [{ buyerId: String(buyerId) }, { buyerId: null }];
    else if (buyerName) query.buyerName = buyerName;

    const updated = await ChatConversation.findOneAndUpdate(
      query,
      {
        $set: {
          sellerSlug: slug,
          sellerName: seller.storeName,
          buyerName: buyerName || 'Customer',
          buyerId: buyerId ? String(buyerId) : null,
          isBlocked: true,
          blockedBy: 'SELLER',
          blockedReason: reason || null,
        },
      },
      { upsert: true, new: true },
    );

    void realtimeEventBus.publishChatBlocked({
      sellerSlug: slug,
      buyerId: buyerId || null,
      buyerName: buyerName || null,
      blockedBy: 'SELLER',
      reason: reason || null,
      timestamp: new Date().toISOString(),
    });

    return sendSuccess(res, { success: true, conversation: updated.toObject() });
  }),
);

sellerApiRouter.post(
  '/chat/unblock',
  requireAuth,
  requireActiveSeller,
  asyncHandler(async (req, res) => {
    const seller = await SellerProfile.findOne({ userId: req.user!.id }).lean();
    if (!seller) throw AppError.forbidden('Seller profile required');
    const { buyerId, buyerName } = req.body ?? {};
    const slug = seller.storeSlug.toLowerCase().trim();
    const query: any = { sellerSlug: slug };
    if (buyerId) query.$or = [{ buyerId: String(buyerId) }, { buyerId: null }];
    else if (buyerName) query.buyerName = buyerName;

    const updated = await ChatConversation.findOneAndUpdate(
      query,
      {
        $set: {
          isBlocked: false,
          blockedBy: null,
          blockedReason: null,
        },
      },
      { new: true },
    );

    void realtimeEventBus.publishChatUnblocked({
      sellerSlug: slug,
      buyerId: buyerId || null,
      buyerName: buyerName || null,
      timestamp: new Date().toISOString(),
    });

    return sendSuccess(res, { success: true, conversation: updated ? updated.toObject() : null });
  }),
);

sellerApiRouter.delete(
  '/chat/conversations',
  requireAuth,
  requireActiveSeller,
  asyncHandler(async (req, res) => {
    const seller = await SellerProfile.findOne({ userId: req.user!.id }).lean();
    if (!seller) throw AppError.forbidden('Seller profile required');
    const slug = seller.storeSlug.toLowerCase().trim();
    const conversations: Array<{ buyerName?: string; buyerId?: string | null }> = Array.isArray(req.body.conversations)
      ? req.body.conversations
      : [{ buyerName: req.body.buyerName, buyerId: req.body.buyerId }];

    for (const item of conversations) {
      const msgFilter: any = { sellerSlug: slug };
      const convFilter: any = { sellerSlug: slug };
      if (item.buyerId) {
        msgFilter.$or = [{ buyerId: String(item.buyerId) }, { buyerId: null }];
        convFilter.$or = [{ buyerId: String(item.buyerId) }, { buyerId: null }];
      } else if (item.buyerName) {
        msgFilter.buyerName = item.buyerName;
        convFilter.buyerName = item.buyerName;
      }
      await ChatMessage.deleteMany(msgFilter);
      await ChatConversation.deleteMany(convFilter);
    }

    void realtimeEventBus.publishChatDeleted({
      sellerSlug: slug,
      deletedConversations: conversations.map((c) => ({ sellerSlug: slug, buyerId: c.buyerId || null })),
      timestamp: new Date().toISOString(),
    });

    return sendSuccess(res, { success: true, count: conversations.length });
  }),
);

sellerApiRouter.delete(
  '/chat/messages',
  requireAuth,
  requireActiveSeller,
  asyncHandler(async (req, res) => {
    const seller = await SellerProfile.findOne({ userId: req.user!.id }).lean();
    if (!seller) throw AppError.forbidden('Seller profile required');
    const slug = seller.storeSlug.toLowerCase().trim();
    const messageIds: string[] = Array.isArray(req.body.messageIds)
      ? req.body.messageIds
      : req.body.messageId
        ? [req.body.messageId]
        : [];

    if (messageIds.length === 0) {
      throw AppError.badRequest('No messageIds specified for deletion');
    }

    const messagesToDelete = await ChatMessage.find({
      _id: { $in: messageIds },
      sellerSlug: slug,
    }).lean();

    if (messagesToDelete.length === 0) {
      return sendSuccess(res, { success: true, count: 0 });
    }

    // Mark matching messages as deleted for seller only (does not delete from buyer view)
    await ChatMessage.updateMany(
      { _id: { $in: messageIds }, sellerSlug: slug },
      { $set: { deletedForSeller: true } },
    );

    // If already deleted by buyer, clean up from database completely
    await ChatMessage.deleteMany({
      _id: { $in: messageIds },
      sellerSlug: slug,
      deletedForBuyer: true,
      deletedForSeller: true,
    });

    // Update affected conversations (using latest still visible to seller)
    const convKeys = new Set<string>();
    for (const msg of messagesToDelete) {
      const key = `${msg.sellerSlug}_${msg.buyerId || msg.buyerName}`;
      if (!convKeys.has(key)) {
        convKeys.add(key);
        const filter: any = { sellerSlug: slug, deletedForSeller: { $ne: true } };
        if (msg.buyerId) filter.$or = [{ buyerId: String(msg.buyerId) }, { buyerId: null }];
        else if (msg.buyerName) filter.buyerName = msg.buyerName;

        const latest = await ChatMessage.findOne(filter).sort({ createdAt: -1 }).lean();
        if (latest) {
          await ChatConversation.updateOne(
            { sellerSlug: slug, ...(msg.buyerId ? { $or: [{ buyerId: String(msg.buyerId) }, { buyerId: null }] } : { buyerName: msg.buyerName }) },
            {
              lastMessage: latest.text,
              lastMessageAt: (latest as any).createdAt,
            },
          );
        }
      }
    }

    return sendSuccess(res, { success: true, count: messagesToDelete.length });
  }),
);

sellerApiRouter.get(
  '/chat/messages',
  requireAuth,
  requireActiveSeller,
  asyncHandler(async (req, res) => {
    const seller = await SellerProfile.findOne({ userId: req.user!.id }).lean();
    if (!seller) return sendSuccess(res, { messages: [] });
    const messages = await ChatMessage.find({
      sellerSlug: seller.storeSlug,
      deletedForSeller: { $ne: true },
    }).sort({ createdAt: 1 }).lean();
    return sendSuccess(res, { messages });
  }),
);

sellerApiRouter.post(
  '/chat/messages',
  requireAuth,
  requireActiveSeller,
  asyncHandler(async (req, res) => {
    const seller = await SellerProfile.findOne({ userId: req.user!.id }).lean();
    if (!seller) throw AppError.forbidden('Seller profile required');
    const {
      text,
      buyerName = 'Customer',
      buyerId = null,
      productId = null,
      productTitle = null,
      productImage = null,
      productPricePaise = null,
      isQuote = false,
      quotePricePaise = null,
      quoteQuantity = null,
      quoteTotalPricePaise = null,
      quoteNotes = null,
    } = req.body ?? {};
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Message text is required' });
    }

    const convFilter: any = { sellerSlug: seller.storeSlug.toLowerCase().trim() };
    if (buyerId) convFilter.$or = [{ buyerId: String(buyerId) }, { buyerId: null }];
    else if (buyerName) convFilter.buyerName = String(buyerName).trim();
    const existingConv = await ChatConversation.findOne(convFilter).lean();
    if (existingConv?.isBlocked) {
      throw AppError.forbidden('This conversation has been blocked. Messaging is disabled.');
    }

    const message = await ChatMessage.create({
      sellerSlug: seller.storeSlug,
      sellerName: seller.storeName,
      buyerName: String(buyerName).trim(),
      buyerId: buyerId ? String(buyerId) : null,
      sender: 'SELLER',
      text: text.trim(),
      productId: productId ? String(productId) : null,
      productTitle: productTitle ? String(productTitle) : null,
      productImage: productImage ? String(productImage) : null,
      productPricePaise: typeof productPricePaise === 'number' ? productPricePaise : null,
      isRead: false,
      isQuote: Boolean(isQuote),
      quotePricePaise: typeof quotePricePaise === 'number' ? quotePricePaise : null,
      quoteQuantity: typeof quoteQuantity === 'number' ? quoteQuantity : null,
      quoteTotalPricePaise: typeof quoteTotalPricePaise === 'number' ? quoteTotalPricePaise : null,
      quoteNotes: quoteNotes ? String(quoteNotes).trim() : null,
      quoteStatus: isQuote ? 'OFFERED' : undefined,
    });

    await ChatConversation.findOneAndUpdate(
      convFilter,
      {
        $set: {
          sellerSlug: seller.storeSlug.toLowerCase().trim(),
          sellerName: seller.storeName,
          buyerName: String(buyerName).trim(),
          buyerId: buyerId ? String(buyerId) : null,
          lastMessage: text.trim(),
          lastMessageAt: new Date(),
        },
        $setOnInsert: {
          isBlocked: false,
          blockedBy: null,
          blockedReason: null,
        },
      },
      { upsert: true, new: true },
    );

    // Broadcast instantly to connected clients on both seller and buyer backends
    void realtimeEventBus.publishChatMessage(message.toObject());
    return sendSuccess(res, { message }, HttpStatus.CREATED);
  }),
);
