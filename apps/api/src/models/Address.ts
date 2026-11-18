import { Schema, model, type InferSchemaType } from 'mongoose';
import { PINCODE_REGEX } from '@haat/shared';

/** Delivery address (PRD §14.5 #4). */
const addressSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    label: { type: String, required: true, trim: true, maxlength: 40 },
    recipientName: { type: String, required: true, trim: true, maxlength: 120 },
    phoneNumber: { type: String, required: true, trim: true, match: /^[6-9]\d{9}$/ },
    line1: { type: String, required: true, trim: true, maxlength: 200 },
    line2: { type: String, trim: true, maxlength: 200, default: null },
    landmark: { type: String, trim: true, maxlength: 120, default: null },
    city: { type: String, required: true, trim: true, maxlength: 80 },
    state: { type: String, required: true, trim: true, maxlength: 80 },
    pincode: { type: String, required: true, trim: true, match: PINCODE_REGEX },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true, toJSON: { versionKey: false }, toObject: { versionKey: false } },
);

addressSchema.index({ userId: 1, isDefault: -1 });

export type AddressAttributes = InferSchemaType<typeof addressSchema>;
export const Address = model('Address', addressSchema);
