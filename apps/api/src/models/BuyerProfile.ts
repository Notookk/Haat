import { Schema, model, type InferSchemaType } from 'mongoose';

/** B2B/B2C buyer attributes (PRD §14.5 #2). One document per buyer. */
const buyerProfileSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    businessName: { type: String, trim: true, maxlength: 120, default: null },
    gstin: { type: String, trim: true, uppercase: true, default: null },
    isVerifiedBusiness: { type: Boolean, default: false, required: true },
  },
  { timestamps: true, toJSON: { versionKey: false }, toObject: { versionKey: false } },
);

export type BuyerProfileAttributes = InferSchemaType<typeof buyerProfileSchema>;
export const BuyerProfile = model('BuyerProfile', buyerProfileSchema);
