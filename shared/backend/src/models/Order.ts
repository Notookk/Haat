import { Schema, model, type InferSchemaType } from 'mongoose';
import { ORDER_PAYMENT_STATUSES, FULFILMENT_STATUSES } from '@haat/shared-contracts';

const orderItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    variantId: { type: Schema.Types.ObjectId, default: null },
    sku: { type: String, required: true },
    title: { type: String, required: true },
    unitPricePaise: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    subtotalPaise: { type: Number, required: true, min: 0 },
    isWholesale: { type: Boolean, default: false },
  },
  { _id: false, versionKey: false },
);

const statusHistorySchema = new Schema(
  {
    from: { type: String, required: true },
    to: { type: String, required: true },
    changedByUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    remarks: { type: String, default: null },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const orderSchema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    idempotencyKey: { type: String, unique: true, sparse: true, index: true },
    buyerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sellerId: { type: Schema.Types.ObjectId, ref: 'SellerProfile', required: true, index: true },
    items: { type: [orderItemSchema], default: [] },
    totalAmountPaise: { type: Number, required: true, min: 0 },
    deliveryFeePaise: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: 'INR' },
    paymentStatus: {
      type: String,
      enum: ORDER_PAYMENT_STATUSES,
      default: 'PENDING',
      index: true,
    },
    fulfilmentStatus: {
      type: String,
      enum: FULFILMENT_STATUSES,
      default: 'PENDING_CONFIRMATION',
      index: true,
    },
    statusHistory: { type: [statusHistorySchema], default: [] },
    paymentMethod: { type: String, default: 'ONLINE' },
    shippingAddress: {
      name: { type: String },
      phone: { type: String },
      addressLine1: { type: String },
      addressLine2: { type: String },
      city: { type: String },
      state: { type: String },
      pincode: { type: String },
    },
    deliveryDate: { type: String, default: null, index: true },
    deliverySlot: {
      slotId: { type: Schema.Types.ObjectId, ref: 'DeliverySlot', default: null },
      startTime: { type: String, default: null },
      endTime: { type: String, default: null },
      label: { type: String, default: null },
    },
    notes: { type: String, default: null },
  },
  { timestamps: true, versionKey: false, autoCreate: false, autoIndex: false },
);

export type OrderAttributes = InferSchemaType<typeof orderSchema>;
export const Order = model('Order', orderSchema);
