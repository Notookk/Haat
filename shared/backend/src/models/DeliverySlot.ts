import { Schema, model, type InferSchemaType, Types } from 'mongoose';

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
export const DeliverySlot = model('DeliverySlot', deliverySlotSchema, 'deliveryslots');

export const DEFAULT_DELIVERY_SLOTS = [
  { startTime: '09:00', endTime: '12:00', capacity: 20 },
  { startTime: '12:00', endTime: '15:00', capacity: 20 },
  { startTime: '16:00', endTime: '20:00', capacity: 20 },
] as const;

export async function initializeDefaultDeliverySlots(sellerId: string | Types.ObjectId | any): Promise<boolean> {
  const sellerObjId = new Types.ObjectId(sellerId.toString());
  const seller = await model('SellerProfile').findById(sellerObjId);
  if (!seller) return false;

  // Only create default slots ONCE upon seller verification/approval
  if ((seller as any).defaultSlotsInitialized) {
    return false;
  }

  for (const s of DEFAULT_DELIVERY_SLOTS) {
    const exists = await DeliverySlot.findOne({
      sellerId: sellerObjId,
      startTime: s.startTime,
      endTime: s.endTime,
      $or: [{ date: null }, { date: { $exists: false } }],
    });
    if (!exists) {
      await DeliverySlot.create({
        sellerId: sellerObjId,
        date: null,
        dayOfWeek: null,
        startTime: s.startTime,
        endTime: s.endTime,
        capacity: s.capacity,
        maxCapacity: s.capacity,
        bookedCount: 0,
        leadTimeHours: 2,
        isActive: true,
      });
    }
  }

  await model('SellerProfile').updateOne(
    { _id: sellerObjId },
    { $set: { defaultSlotsInitialized: true } },
  );

  return true;
}
