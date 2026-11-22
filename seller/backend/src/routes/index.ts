import { Router } from 'express';
import {
  Category,
  Product,
  SellerProfile,
  ChatMessage,
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
    const categories = await Category.find({ isActive: true }).sort({ displayOrder: 1, name: 1 }).lean();
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
  '/chat/messages',
  requireAuth,
  requireActiveSeller,
  asyncHandler(async (req, res) => {
    const seller = await SellerProfile.findOne({ userId: req.user!.id }).lean();
    if (!seller) return sendSuccess(res, { messages: [] });
    const messages = await ChatMessage.find({ sellerSlug: seller.storeSlug }).sort({ createdAt: 1 }).lean();
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
    const { text, buyerName = 'Customer', buyerId = null, productId = null, productTitle = null } = req.body ?? {};
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Message text is required' });
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
      isRead: true,
    });
    // Broadcast instantly to connected clients on both seller and buyer backends
    void realtimeEventBus.publishChatMessage(message.toObject());
    return sendSuccess(res, { message }, HttpStatus.CREATED);
  }),
);
