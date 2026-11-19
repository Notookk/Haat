import { Schema, model, type InferSchemaType } from 'mongoose';

const transactionSchema = new Schema(
  {
    transactionId: { type: String, required: true, unique: true, index: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    buyerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sellerId: { type: Schema.Types.ObjectId, ref: 'SellerProfile', required: true, index: true },
    amountPaise: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, default: 'ONLINE' },
    paymentStatus: { type: String, default: 'SUCCESS', index: true },
    gatewayReference: { type: String, default: null },
  },
  { timestamps: true, versionKey: false, autoCreate: false, autoIndex: false },
);

export type TransactionAttributes = InferSchemaType<typeof transactionSchema>;
export const Transaction = model('Transaction', transactionSchema);
