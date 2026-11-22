import { Schema, model, type InferSchemaType } from 'mongoose';

const deliverySlotSchema = new Schema(
  {
    sellerId: { type: Schema.Types.ObjectId, ref: 'SellerProfile', required: true, index: true },
    date: { type: String, default: null, index: true }, // 'YYYY-MM-DD'
    dayOfWeek: { type: String, default: null, index: true }, // 'MONDAY', etc.
    startTime: { type: String, required: true }, // 'HH:MM'
    endTime: { type: String, required: true }, // 'HH:MM'
    capacity: { type: Number, default: 20, min: 1 },
    maxCapacity: { type: Number, default: 20, min: 1 },
    bookedCount: { type: Number, default: 0, min: 0 },
    leadTimeHours: { type: Number, default: 0, min: 0 },
    cutoffTime: { type: String, default: null },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, versionKey: false },
);

deliverySlotSchema.index({ sellerId: 1, startTime: 1, endTime: 1 });

export type DeliverySlotAttributes = InferSchemaType<typeof deliverySlotSchema>;
export const DeliverySlot = model('DeliverySlot', deliverySlotSchema);
