import { asyncHandler, sendSuccess } from '@haat/shared-backend';
import {
  listBuyerOrders,
  getOrderDetails,
  listSellerOrders,
  updateOrderStatus,
  cancelBuyerOrder,
  getOrderReceipt,
} from '../services/orders.service';

export const listBuyerOrdersHandler = asyncHandler(async (req, res) => {
  const buyerId = req.user!.id;
  const orders = await listBuyerOrders(buyerId);
  return sendSuccess(res, { orders });
});

export const getOrderDetailsHandler = asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const role = req.user!.role;
  const order = await getOrderDetails(req.params.id, userId, role);
  return sendSuccess(res, { order });
});

export const listSellerOrdersHandler = asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const orders = await listSellerOrders(userId);
  return sendSuccess(res, { orders });
});

export const updateOrderStatusHandler = asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const order = await updateOrderStatus(userId, req.params.id, req.body);
  return sendSuccess(res, { order });
});

export const cancelBuyerOrderHandler = asyncHandler(async (req, res) => {
  const buyerId = req.user!.id;
  const order = await cancelBuyerOrder(buyerId, req.params.id, req.body);
  return sendSuccess(res, { order });
});

export const getOrderReceiptHandler = asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const role = req.user!.role;
  const receipt = await getOrderReceipt(req.params.id, userId, role);
  return sendSuccess(res, { receipt });
});
