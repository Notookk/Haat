import { Schema, model, type InferSchemaType } from 'mongoose';
import { QUOTATION_STATUSES } from '@haat/shared-contracts';

const quotationSchema = new Schema(
  {
    quotationNumber: { type: String, required: true, unique: true, index: true },
    rfqId: { type: Schema.Types.ObjectId, ref: 'Rfq', required: true, index: true },
    sellerId: { type: Schema.Types.ObjectId, ref: 'SellerProfile', required: true, index: true },
    buyerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    version: { type: Number, default: 1, min: 1 },
    offeredUnitPricePaise: { type: Number, required: true, min: 1, validate: Number.isSafeInteger },
    minQuantity: { type: Number, required: true, min: 1, validate: Number.isInteger },
    deliveryFeePaise: { type: Number, default: 0, min: 0, validate: Number.isSafeInteger },
    validUntil: { type: Date, required: true },
    sellerTerms: { type: String, default: '', trim: true, maxlength: 2000 },
    status: {
      type: String,
      enum: QUOTATION_STATUSES,
      default: 'ISSUED',
      index: true,
    },
  },
  { timestamps: true, versionKey: false, autoCreate: false, autoIndex: false },
);

export type QuotationAttributes = InferSchemaType<typeof quotationSchema>;
export const Quotation = model('Quotation', quotationSchema);
