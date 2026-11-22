import { asyncHandler, sendSuccess } from '@haat/shared-backend';
import {
  createPaymentIntent,
  verifyPayment,
  processWebhook,
} from '../services/payments.service';

export const createPaymentIntentHandler = asyncHandler(async (req, res) => {
  const buyerId = req.user!.id;
  const { orderId } = req.body;
  const data = await createPaymentIntent(buyerId, orderId);
  return sendSuccess(res, data);
});

export const verifyPaymentHandler = asyncHandler(async (req, res) => {
  const buyerId = req.user!.id;
  const result = await verifyPayment(buyerId, req.body);
  return sendSuccess(res, result);
});

export const webhookHandler = asyncHandler(async (req, res) => {
  const signature = req.headers['x-razorpay-signature'] as string | undefined;
  const result = await processWebhook(req.body, signature);
  return res.status(200).json(result);
});
