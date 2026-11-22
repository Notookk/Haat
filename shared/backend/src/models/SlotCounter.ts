import { Schema, model, type InferSchemaType } from 'mongoose';

const slotCounterSchema = new Schema(
  {
    sellerId: { type: Schema.Types.ObjectId, ref: 'SellerProfile', required: true, index: true },
    slotId: { type: Schema.Types.ObjectId, ref: 'DeliverySlot', required: true, index: true },
    date: { type: String, required: true, index: true }, // Format: YYYY-MM-DD
    booked: { type: Number, default: 0, min: 0, validate: Number.isInteger },
    maxCapacity: { type: Number, required: true, min: 1, validate: Number.isInteger },
  },
  { timestamps: true, versionKey: false, autoCreate: false, autoIndex: false },
);

slotCounterSchema.index({ sellerId: 1, slotId: 1, date: 1 }, { unique: true });

export type SlotCounterAttributes = InferSchemaType<typeof slotCounterSchema>;
export const SlotCounter = model('SlotCounter', slotCounterSchema);
