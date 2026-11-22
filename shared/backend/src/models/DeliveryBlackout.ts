import { Schema, model, type InferSchemaType } from 'mongoose';

const deliveryBlackoutSchema = new Schema(
  {
    sellerId: { type: Schema.Types.ObjectId, ref: 'SellerProfile', required: true, index: true },
    date: { type: String, required: true }, // Format: YYYY-MM-DD
    reason: { type: String, trim: true, default: null },
  },
  { timestamps: true, versionKey: false, autoCreate: false, autoIndex: false },
);

deliveryBlackoutSchema.index({ sellerId: 1, date: 1 }, { unique: true });

export type DeliveryBlackoutAttributes = InferSchemaType<typeof deliveryBlackoutSchema>;
export const DeliveryBlackout = model('DeliveryBlackout', deliveryBlackoutSchema);
