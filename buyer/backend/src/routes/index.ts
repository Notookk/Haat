import { Router } from 'express';
import { authRouter } from '../modules/auth/routes/auth.routes';
import { catalogRouter } from '../modules/catalog/routes/catalog.routes';
import { productRouter } from '../modules/sellers/routes/seller-product.routes';
import { categoryRouter } from '../modules/categories/routes/category.routes';
import { getStorefrontHandler } from '../modules/sellers/controllers/seller.controller';
import { cartRouter } from '../modules/cart/routes/cart.routes';
import { deliveryRouter, sellerDeliveryRouter } from '../modules/delivery/routes/delivery.routes';
import { checkoutRouter } from '../modules/checkout/routes/checkout.routes';
import { rfqRouter, sellerRfqRouter } from '../modules/rfq/routes/rfq.routes';
import { ordersRouter, sellerOrdersRouter } from '../modules/orders/routes/orders.routes';
import { paymentsRouter } from '../modules/payments/routes/payments.routes';
import { chatRouter, sellerChatRouter } from '../modules/chat/routes/chat.routes';
import { addressesRouter } from '../modules/addresses/addresses.routes';
import { asyncHandler, sendSuccess, ChatMessage, HttpStatus } from '@haat/shared-backend';

export const buyerApiRouter = Router();

buyerApiRouter.get('/health', (_req, res) => {
  res.status(200).json({ success: true, status: 'ok', service: 'haat-buyer-api' });
});

buyerApiRouter.use('/auth', authRouter);
buyerApiRouter.use('/categories', categoryRouter);
buyerApiRouter.use('/products', productRouter);
buyerApiRouter.use('/catalog', catalogRouter);
buyerApiRouter.get('/stores/:slug', getStorefrontHandler);
buyerApiRouter.get('/store/:slug', getStorefrontHandler);

// Part 2 & 3 Modules
buyerApiRouter.use('/cart', cartRouter);
buyerApiRouter.use('/delivery', deliveryRouter);
buyerApiRouter.use('/seller/delivery', sellerDeliveryRouter);
buyerApiRouter.use('/checkout', checkoutRouter);
buyerApiRouter.use('/rfq', rfqRouter);
buyerApiRouter.use('/seller/rfq', sellerRfqRouter);
buyerApiRouter.use('/orders', ordersRouter);
buyerApiRouter.use('/seller/orders', sellerOrdersRouter);
buyerApiRouter.use('/addresses', addressesRouter);
buyerApiRouter.use('/payments', paymentsRouter);
buyerApiRouter.use('/chat', chatRouter);
buyerApiRouter.use('/seller/chat', sellerChatRouter);

// Backwards-compatible direct chat message routes
buyerApiRouter.get(
  '/chat/messages',
  asyncHandler(async (req, res) => {
    const seller = String(req.query.seller || 'abcd-store').toLowerCase();
    const messages = await ChatMessage.find({ sellerSlug: seller, deletedForBuyer: { $ne: true } }).sort({ createdAt: 1 }).limit(100).lean();
    return sendSuccess(res, { messages });
  }),
);

buyerApiRouter.post(
  '/chat/messages',
  asyncHandler(async (req, res) => {
    const {
      sellerSlug = 'abcd-store',
      sellerName = 'ABCD Store',
      buyerName = 'Customer',
      buyerId = null,
      text,
      productId = null,
      productTitle = null,
      productImage = null,
      productPricePaise = null,
    } = req.body ?? {};

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Message text is required' });
    }

    const message = await ChatMessage.create({
      sellerSlug: String(sellerSlug).toLowerCase().trim(),
      sellerName: String(sellerName).trim(),
      buyerName: String(buyerName).trim(),
      buyerId: buyerId ? String(buyerId) : null,
      sender: 'BUYER',
      text: text.trim(),
      productId: productId ? String(productId) : null,
      productTitle: productTitle ? String(productTitle) : null,
      productImage: productImage ? String(productImage) : null,
      productPricePaise: typeof productPricePaise === 'number' ? productPricePaise : null,
      isRead: false,
    });

    return sendSuccess(res, { message }, HttpStatus.CREATED);
  }),
);
