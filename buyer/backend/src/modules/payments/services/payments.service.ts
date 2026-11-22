import crypto from 'crypto';
import { Types } from 'mongoose';
import {
  Order,
  Transaction,
  AppError,
  env,
} from '@haat/shared-backend';
import type { VerifyPaymentSignatureInput } from '@haat/shared-contracts';

export async function createPaymentIntent(buyerId: string, orderId: string) {
  const order = await Order.findById(orderId);
  if (!order) {
    throw AppError.notFound('Order not found.');
  }

  if (String(order.buyerId) !== buyerId) {
    throw AppError.forbidden('You can only pay for your own orders.');
  }

  if (order.paymentStatus === 'PAID') {
    throw AppError.badRequest('This order has already been paid.');
  }

  const gatewayOrderId = `order_rzp_${String(order._id).slice(-8)}_${Date.now()}`;

  // Record pending transaction
  await Transaction.findOneAndUpdate(
    { orderId: order._id },
    {
      $set: {
        transactionId: gatewayOrderId,
        buyerId: order.buyerId,
        sellerId: order.sellerId,
        amountPaise: order.totalAmountPaise,
        paymentMethod: 'RAZORPAY',
        paymentStatus: 'PENDING',
        gatewayReference: gatewayOrderId,
      },
    },
    { upsert: true, new: true },
  );

  return {
    orderId: String(order._id),
    gatewayOrderId,
    amountPaise: order.totalAmountPaise,
    currency: order.currency || 'INR',
    keyId: env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
  };
}

export async function verifyPayment(buyerId: string, input: VerifyPaymentSignatureInput) {
  const order = await Order.findById(input.orderId);
  if (!order) {
    throw AppError.notFound('Order not found.');
  }

  if (String(order.buyerId) !== buyerId) {
    throw AppError.forbidden('Unauthorized.');
  }

  // Cryptographic signature verification if secret is configured and not test placeholder
  const webhookSecret = env.RAZORPAY_WEBHOOK_SECRET || env.RAZORPAY_KEY_SECRET;
  if (webhookSecret && !webhookSecret.includes('placeholder') && !webhookSecret.includes('your_razorpay')) {
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(`${input.razorpay_order_id}|${input.razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== input.razorpay_signature) {
      throw AppError.badRequest('Invalid payment signature verification failed.');
    }
  }

  // Update transaction status
  await Transaction.findOneAndUpdate(
    { orderId: order._id },
    {
      $set: {
        paymentStatus: 'SUCCESS',
        gatewayReference: input.razorpay_payment_id,
      },
    },
  );

  // Update order status
  order.paymentStatus = 'PAID';
  order.fulfilmentStatus = 'CONFIRMED';
  order.statusHistory.push({
    from: 'PENDING',
    to: 'PAID',
    changedByUserId: new Types.ObjectId(buyerId),
    remarks: `Payment verified. Ref: ${input.razorpay_payment_id}`,
    at: new Date(),
  });

  await order.save();
  return { success: true, order: order.toObject() };
}

export async function processWebhook(payload: any, signature?: string) {
  const secret = env.RAZORPAY_WEBHOOK_SECRET;
  if (secret && signature && !secret.includes('placeholder')) {
    const shasum = crypto.createHmac('sha256', secret);
    shasum.update(JSON.stringify(payload));
    const digest = shasum.digest('hex');
    if (digest !== signature) {
      throw AppError.badRequest('Invalid webhook signature.');
    }
  }

  if (payload.event === 'payment.captured') {
    const payment = payload.payload?.payment?.entity;
    const orderNotes = payment?.notes || {};
    const orderId = orderNotes.orderId;

    if (orderId) {
      await Order.findByIdAndUpdate(orderId, {
        $set: { paymentStatus: 'PAID', fulfilmentStatus: 'CONFIRMED' },
        $push: {
          statusHistory: {
            from: 'PENDING',
            to: 'PAID',
            remarks: `Captured via Razorpay Webhook ${payment.id}`,
            at: new Date(),
          },
        },
      });
    }
  }

  return { received: true };
}
