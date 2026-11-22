import { Schema, model, type InferSchemaType } from 'mongoose';
import { RFQ_STATUSES } from '@haat/shared-contracts';

const rfqSchema = new Schema(
  {
    rfqNumber: { type: String, required: true, unique: true, index: true },
    buyerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sellerId: { type: Schema.Types.ObjectId, ref: 'SellerProfile', required: true, index: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    variantId: { type: Schema.Types.ObjectId, default: null },
    requestedQuantity: { type: Number, required: true, min: 1, validate: Number.isInteger },
    targetPricePaise: { type: Number, default: null },
    deliveryPincode: { type: String, required: true, trim: true },
    preferredDate: { type: String, default: null },
    notes: { type: String, default: '', trim: true, maxlength: 2000 },
    status: {
      type: String,
      enum: RFQ_STATUSES,
      default: 'SUBMITTED',
      index: true,
    },
  },
  { timestamps: true, versionKey: false, autoCreate: false, autoIndex: false },
);

export type RfqAttributes = InferSchemaType<typeof rfqSchema>;
export const Rfq = model('Rfq', rfqSchema);
