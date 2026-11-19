import { Schema, model, type InferSchemaType } from 'mongoose';

const deliverySlotSchema = new Schema(
  {
    sellerId: { type: Schema.Types.ObjectId, ref: 'SellerProfile', required: true, index: true },
    date: { type: String, required: true, index: true }, // 'YYYY-MM-DD'
    startTime: { type: String, required: true }, // 'HH:MM'
    endTime: { type: String, required: true }, // 'HH:MM'
    capacity: { type: Number, required: true, min: 1 },
    bookedCount: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, versionKey: false },
);

deliverySlotSchema.index({ sellerId: 1, date: 1, startTime: 1, endTime: 1 }, { unique: true });

export type DeliverySlotAttributes = InferSchemaType<typeof deliverySlotSchema>;
export const DeliverySlot = model('DeliverySlot', deliverySlotSchema);
