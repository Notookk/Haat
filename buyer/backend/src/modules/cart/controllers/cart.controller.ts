import { asyncHandler, sendSuccess, HttpStatus } from '@haat/shared-backend';
import {
  getHydratedCart,
  addItemToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
} from '../services/cart.service';

export const getCartHandler = asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const cart = await getHydratedCart(userId);
  return sendSuccess(res, { cart });
});

export const addItemHandler = asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const cart = await addItemToCart(userId, req.body);
  return sendSuccess(res, { cart }, HttpStatus.CREATED);
});

export const updateItemHandler = asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const cart = await updateCartItem(userId, req.params.productId, req.body);
  return sendSuccess(res, { cart });
});

export const removeItemHandler = asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const variantId = typeof req.query.variantId === 'string' ? req.query.variantId : null;
  const cart = await removeCartItem(userId, req.params.productId, variantId);
  return sendSuccess(res, { cart });
});

export const clearCartHandler = asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const cart = await clearCart(userId);
  return sendSuccess(res, { cart });
});
